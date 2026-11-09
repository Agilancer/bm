// What the wizards and necromancers cast, once it's left the hand. None of it is the player's: each answers to something other than
// standing still, and most can be got out of by something other than running away from it. A spell here is a function that puts one
// or more works in the air; a work is a step function that says each tick whether it's still going.
// how: 'shoot' gathers in the raised hand and looses. 'raise' gathers, then holds the hand up for as long as the spell runs. 'lob' throws overarm.
import { EV } from '../core/layout.js';
import { clamp } from '../core/math.js';
import { ELEM, FX } from './spells.js';

const TAU = Math.PI * 2;
const { FIRE, FROST, ARCANE, STORM, DRAIN, BONE, VOID, POISON } = ELEM;
const rnd = (a, b) => a + Math.random() * (b - a);
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };
const flow = new Float32Array(2);

const work = (sim, step) => { sim.foeWorks.push(step); };

// A blow that can be stood in the way of goes in with block false: ground and beams pass a shield by.
// p: who it's at, the player or one of the other Tessariels (src/sim/foes.js): sim.foeTarget while a spell is being made.
function strike(sim, p, dmg, x, z, knock = 0, unblockable = false) {
  if (p.dead || p.iframes) return false;
  if (p.damage(sim, dmg, x, z, knock, unblockable) === false) return false;
  if (p === sim.player) sim.event(EV.HURT, p.x, p.y + 1.1, p.z, dmg);
  return true;
}

function boom(sim, elem, x, y, z, R, dmg, knock = 4) {
  const c = sim.casting, p = sim.foeTarget || sim.player, g = sim.world.height(x, z);
  c.burst(FX.FLARE, elem, x, y, z, R * 0.9, R * 1.9, 0.3, { alpha: 1.3, light: 26 + R * 7, lightR: R * 4.5 });
  c.burst(FX.ORB, elem, x, y, z, R * 0.4, R * 0.85, 0.4, { alpha: 1.1, ease: 3 });
  c.burst(FX.SHOCK, elem, x, y, z, R * 0.3, R * 1.2, 0.45, { alpha: 0.9, ease: 3.2 });
  c.burst(FX.RING, elem, x, g, z, R * 0.3, R * 1.35, 0.55, { alpha: 1, ease: 2.6 });
  c.burst(FX.DISC, elem, x, g, z, R * 0.6, R * 0.85, 2, { alpha: 0.85, ease: 6 });
  sim.event(EV.SPELL_BOOM, elem, x, y, z, R);
  const near = Math.hypot(p.x - x, p.y + 1 - y, p.z - z);
  if (p === sim.player) p.trauma = Math.min(1, p.trauma + clamp(R * 0.2 / (1 + near * 0.16), 0, 0.7));
  if (near < R) strike(sim, p, dmg * clamp(1.15 - near / R, 0.35, 1), x, z, knock, true);
}

// Something flying. o.home is how hard it turns after you, and o.homeFor for how long; after that you can step out of it.
function shot(sim, o) {
  const c = sim.casting, p = sim.foeTarget || sim.player;
  const b = { age: 0, home: 1.6, homeFor: 0.6, size: 0.14, life: 3.5, seed: Math.random(), R: 0, knock: 0, ...o };
  sim.event(EV.SPELL_LOOSE, b.elem, 0, b.x, b.y, b.z);
  work(sim, (dt) => {
    b.age += dt;
    if (b.age < b.homeFor && !p.dead) {
      let ax = p.x - b.x, ay = p.y + 1.1 - b.y, az = p.z - b.z;
      const L = Math.hypot(ax, ay, az) || 1; ax /= L; ay /= L; az /= L;
      const k = 1 - Math.exp(-b.home * dt);
      b.dx += (ax - b.dx) * k; b.dy += (ay - b.dy) * k; b.dz += (az - b.dz) * k;
      const l = Math.hypot(b.dx, b.dy, b.dz) || 1; b.dx /= l; b.dy /= l; b.dz /= l;
    }
    b.x += b.dx * b.speed * dt; b.y += b.dy * b.speed * dt; b.z += b.dz * b.speed * dt;
    const low = clamp(b.y, p.y + 0.2, p.y + 1.5);
    const hit = !p.dead && !p.iframes && Math.hypot(b.x - p.x, b.y - low, b.z - p.z) < 0.34 + b.size;
    if (hit || b.y < sim.world.height(b.x, b.z) || sim.world.inside(b.x, b.z, 0.05) || b.age > b.life) {
      if (b.R) boom(sim, b.elem, b.x, b.y, b.z, b.R, b.dmg, b.knock);
      else {
        if (hit) strike(sim, p, b.dmg, b.x, b.z, b.knock);
        c.burst(FX.FLARE, b.elem, b.x, b.y, b.z, 0.3, 0.9, 0.22, { alpha: 1.2, light: 18, lightR: 7 });
        sim.event(EV.BLINK, b.x, b.y, b.z);
      }
      return false;
    }
    c.fx(FX.ORB, b.elem, b.x, b.y, b.z, b.size, 0, 1, 0, 0, 1, 14, 8, 0, b.seed);
    c.fx(FX.TRAIL, b.elem, b.x, b.y, b.z, b.size * 0.65, -b.dx, -b.dy, -b.dz, Math.min(b.age * b.speed, 1.8), 0.85, 0, 0, 0, b.seed);
    return true;
  });
}

// A line from one thing to another, with what's being carried along it.
function thread(c, elem, ax, ay, az, bx, by, bz, wide, seed, flowing = 0) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
  c.fx(FX.BEAM, elem, ax, ay, az, wide * 0.6, dx / L, dy / L, dz / L, L, 1, 0, 0, 0, seed, wide);
  for (let i = 0; i < flowing; i++) {
    const u = (seed * 7 + c.clock * 0.9 + i / flowing) % 1;
    c.fx(FX.FLARE, elem, ax + dx * u, ay + dy * u, az + dz * u, 0.14, 0, 1, 0, 0, 0.9, 0, 0, 0.5, i * 0.17);
  }
}

// A patch of ground gone bad: stood in, it bites every half second.
function patch(sim, elem, x, z, R, life, dps, flames) {
  const c = sim.casting, p = sim.foeTarget || sim.player, seed = Math.random();
  let t = 0, tick = 0.5;
  const y = sim.world.height(x, z);
  work(sim, (dt) => {
    t += dt; tick -= dt;
    if (t >= life) return false;
    const k = smooth(t / 0.3) * smooth((life - t) / 0.8);
    c.fx(FX.DISC, elem, x, y, z, R, 0, 1, 0, 0, k * 0.9, 0, 0, t / life, seed);
    for (let i = 0; i < flames; i++) {
      const a = i * 2.399 + seed * 9, r = R * (0.2 + 0.6 * ((i * 0.37 + seed) % 1)), fx = x + Math.cos(a) * r, fz = z + Math.sin(a) * r;
      if (elem === POISON) c.fx(FX.PUFF, elem, fx, sim.world.height(fx, fz) + 0.5, fz, R * 0.55, 0, 1, 0, 0, 0.6 * k, 0, 0, 0, seed + i * 0.2);
      else c.fx(FX.FLAME, elem, fx, sim.world.height(fx, fz) - 0.05, fz, (0.9 + 0.5 * ((i * 0.61 + seed) % 1)) * k, 0, 1, 0, 0.7, 0.85, i === 0 ? 7 * k : 0, 5, 0, seed + i * 0.41);
    }
    if (tick <= 0) {
      tick = 0.5;
      if (Math.hypot(p.x - x, p.z - z) < R && Math.abs(p.y - y) < 1.6) strike(sim, p, dps * 0.5, x, z, 0, true);
    }
    return true;
  });
}

// Fenced in. Inside it you can do as you like; getting out costs you, and the fence puts you back.
function fence(sim, x, z, R, life, armed, dmg, draw) {
  const c = sim.casting, p = sim.foeTarget || sim.player;
  let t = 0, zapT = 0;
  const caught = () => Math.hypot(p.x - x, p.z - z) < R + 0.6;
  let held = caught();
  work(sim, (dt) => {
    t += dt; zapT -= dt;
    if (t >= life) return false;
    draw(smooth(t / armed) * smooth((life - t) / 0.35), t);
    if (t < armed || !held || p.dead) { if (t < armed) held = caught(); return true; }
    const dx = p.x - x, dz = p.z - z, L = Math.hypot(dx, dz), limit = R - 0.45;
    if (L > limit) {
      p.x = x + dx / L * limit; p.z = z + dz / L * limit;
      p.vx *= -0.3; p.vz *= -0.3;
      if (zapT <= 0) { zapT = 0.55; strike(sim, p, dmg, p.x + dx / L, p.z + dz / L, 3, true); c.burst(FX.FLARE, draw.elem, p.x + dx / L * 0.45, p.y + 1.1, p.z + dz / L * 0.45, 0.4, 1.3, 0.2, { alpha: 1.2, light: 16, lightR: 6 }); }
    }
    return true;
  });
}

const lead = (p, t) => [p.x + p.vx * t, p.z + p.vz * t];

export const FOE = {
  // The plain answer, when there's nothing cleverer to do: the bolt each carries is its own.
  bolt: {
    how: 'shoot', charge: 0.1, elem: (k) => k.opts.boltElem,
    fire(k, sim, p, d, _, h) {
      const speed = 15, t = d / speed * 0.6, [lx, lz] = lead(p, t);
      let ax = lx - h[0], ay = p.y + 1.1 - h[1], az = lz - h[2];
      const L = Math.hypot(ax, ay, az) || 1;
      shot(sim, { elem: k.opts.boltElem, x: h[0], y: h[1], z: h[2], dx: ax / L, dy: ay / L, dz: az / L, speed, dmg: 12 });
    },
  },

  // ---- the wizards' ----------------------------------------------------------------------------------------

  // Three colours thrown wide of you, one each way and one straight, that all come in together.
  prism: {
    how: 'shoot', charge: 0.45, elem: () => ARCANE,
    fire(k, sim, p, d, _, h) {
      [[FIRE, 0], [FROST, 0.75], [STORM, -0.75]].forEach(([elem, off]) => {
        const a = Math.atan2(p.x - h[0], p.z - h[2]) + off;
        shot(sim, { elem, x: h[0], y: h[1], z: h[2], dx: Math.sin(a), dy: 0.1, dz: Math.cos(a), speed: 15, dmg: 11, size: 0.17, home: 3.2, homeFor: 1.1 });
      });
    },
  },

  // A crown of little storms over the head. They go at you one by one while it does other things, or all at once if you come close.
  crown: {
    how: 'raise', charge: 0.35, hold: 0.45, elem: () => STORM,
    fire(k, sim, p) {
      const c = sim.casting;
      const orbs = [0, 1, 2, 3, 4, 5];
      let t = 0, nextT = 1.2;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      work(sim, (dt) => {
        t += dt; nextT -= dt;
        if (k.dead || t > 12 || !orbs.length) return false;
        const pos = (i) => { const a = i / 6 * TAU + t * 2.1; return [k.x + Math.cos(a) * 0.95, k.y + 2.05 + Math.sin(t * 3 + i) * 0.1, k.z + Math.sin(a) * 0.95]; };
        const close = Math.hypot(p.x - k.x, p.z - k.z) < 4.5;
        if ((nextT <= 0 || close) && sim.world.sees(k.x, k.y + 2, k.z, p.x, p.y + 1.2, p.z)) {
          nextT = rnd(0.9, 1.5);
          const i = orbs.pop(), at = pos(i);
          let ax = p.x - at[0], ay = p.y + 1.1 - at[1], az = p.z - at[2];
          const L = Math.hypot(ax, ay, az) || 1;
          shot(sim, { elem: STORM, x: at[0], y: at[1], z: at[2], dx: ax / L, dy: ay / L, dz: az / L, speed: 19, dmg: 9, home: 1.2, homeFor: 0.5, size: 0.12 });
        }
        orbs.forEach((i, n) => {
          const at = pos(i), to = pos(orbs[(n + 1) % orbs.length]), dx = to[0] - at[0], dy = to[1] - at[1], dz = to[2] - at[2], L = Math.hypot(dx, dy, dz) || 1;
          c.fx(FX.ORB, STORM, at[0], at[1], at[2], 0.11, 0, 1, 0, 0, 1, n === 0 ? 10 : 0, 6, 0, i * 0.3);
          if (orbs.length > 1) c.fx(FX.BOLT, STORM, at[0], at[1], at[2], 0.16, dx / L, dy / L, dz / L, L, 0.75, 0, 0, 0, i * 0.2 + 0.1, 0.22);
        });
        return true;
      });
    },
  },

  // Stones called down one after another, each on where you're going rather than where you are. Each leaves the ground burning behind it, so the room gets smaller.
  fallingSky: {
    how: 'raise', charge: 0.6, hold: 3, big: true, elem: () => FIRE,
    fire(k, sim, p, d, token) {
      const c = sim.casting;
      let t = 0, nextT = 0, left = 6;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      work(sim, (dt) => {
        t += dt; nextT -= dt;
        if (left > 0 && nextT <= 0 && token.live) {
          left--; nextT = 0.55;
          const fall = 1.05, [lx, lz] = lead(p, fall * 0.8), x = lx + rnd(-1.1, 1.1), z = lz + rnd(-1.1, 1.1), y = sim.world.height(x, z), sx = x + rnd(-9, 9), sz = z + rnd(-9, 9), seed = Math.random();
          let u = 0;
          work(sim, (ds) => {
            u += ds / fall;
            const f = u * u, fx = sx + (x - sx) * f, fy = y + 34 * (1 - f), fz = sz + (z - sz) * f;
            let dx = x - sx, dy = -34, dz = z - sz;
            const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
            c.fx(FX.RUNE, FIRE, x, y + 0.03, z, 3 * smooth(u * 4), 0, 1, 0, 0, 0.6 + u * 0.6, 0, 0, u, seed);
            if (u >= 1) {
              boom(sim, FIRE, x, y + 0.8, z, 3.2, 30, 6);
              c.burst(FX.COLUMN, FIRE, x, y, z, 6, 8, 0.4, { len: 2.6, alpha: 0.8 });
              patch(sim, FIRE, x, z, 2.2, 4, 9, 3);
              return false;
            }
            c.fx(FX.ROCK, FIRE, fx - dx * 0.7, fy - dy * 0.7, fz - dz * 0.7, 0.75, dx, dy, dz, 1.4, 1, 26, 18, u, seed);
            c.fx(FX.ORB, FIRE, fx, fy, fz, 1, 0, 1, 0, 0, 0.55, 0, 0, 0, seed);
            c.fx(FX.TRAIL, FIRE, fx, fy, fz, 0.42, -dx, -dy, -dz, 7, 0.5, 0, 0, 0, seed);
            return true;
          });
        }
        return left > 0 && (token.live || t < 0.1);
      });
    },
  },

  // Five posts come down around you with lightning strung between them. There's time to get out before they join, and then there isn't.
  stormCage: {
    how: 'shoot', charge: 0.5, big: true, elem: () => STORM,
    fire(k, sim, p) {
      const c = sim.casting, x = p.x + p.vx * 0.3, z = p.z + p.vz * 0.3, R = 6, N = 5, spin = Math.random() * TAU, seed = Math.random();
      const posts = [];
      for (let i = 0; i < N; i++) {
        const a = spin + i / N * TAU, px = x + Math.cos(a) * R, pz = z + Math.sin(a) * R;
        posts.push([px, sim.world.height(px, pz), pz]);
        c.burst(FX.FLARE, STORM, px, posts[i][1] + 1.5, pz, 0.5, 1.6, 0.3, { alpha: 1.2, light: 16, lightR: 6 });
      }
      sim.event(EV.SPELL_BOOM, STORM, x, p.y + 1, z, 2);
      const draw = (kk, t) => {
        posts.forEach((q, i) => {
          const n = posts[(i + 1) % N], dx = n[0] - q[0], dz = n[2] - q[2], dy = n[1] - q[1], L = Math.hypot(dx, dy, dz) || 1;
          c.fx(FX.COLUMN, STORM, q[0], q[1], q[2], 3.4 * kk, 0, 1, 0, 0.5, 0.9 * kk, i === 0 ? 14 * kk : 0, 9, 0, seed + i * 0.2);
          c.fx(FX.FLARE, STORM, q[0], q[1] + 2.5, q[2], 0.4, 0, 1, 0, 0, kk, 0, 0, 0.5, i * 0.1);
          if (t > 0.9) {
            c.fx(FX.BOLT, STORM, q[0], q[1] + 1, q[2], 0.8, dx / L, dy / L, dz / L, L, kk * 0.5, 0, 0, 0, seed + i * 0.13, 0.42);
            c.fx(FX.BOLT, STORM, q[0], q[1] + 2.1, q[2], 0.7, dx / L, dy / L, dz / L, L, kk * 0.42, 0, 0, 0, seed + i * 0.29, 0.46);
          } else c.fx(FX.BEAM, STORM, q[0], q[1] + 1.4, q[2], 0.015, dx / L, dy / L, dz / L, L, 0.6, 0, 0, 0, seed, 0.015);
        });
      };
      draw.elem = STORM;
      fence(sim, x, z, R, 6, 0.9, 13, draw);
    },
  },

  // A low ray swept across you from one side to the other, burning the ground it passes. It goes knee high: jump it.
  searingRay: {
    how: 'raise', charge: 0.25, hold: 2.9, big: true, elem: () => FIRE,
    fire(k, sim, p, d, token, h) {
      const c = sim.casting, g = () => sim.world.height(k.x, k.z), side = Math.random() < 0.5 ? 1 : -1, mid = Math.atan2(p.x - k.x, p.z - k.z), seed = Math.random(), WARN = 0.65, SWEEP = 2.2;
      let t = 0, tick = 0, scorch = 0;
      work(sim, (dt) => {
        t += dt; tick -= dt; scorch -= dt;
        if (!token.live || k.dead || t > WARN + SWEEP) return false;
        const u = clamp((t - WARN) / SWEEP, 0, 1), a = mid + side * (0.85 - 1.7 * smooth(u)), ox = k.x + Math.sin(a) * 0.5, oz = k.z + Math.cos(a) * 0.5, oy = k.handAt()[1];
        const far = 26, ey = g() + 0.55, dy = (ey - oy) / far, dl = Math.hypot(1, dy), dx = Math.sin(a) / dl, ny = dy / dl, dz = Math.cos(a) / dl;
        const L = c.trace(sim, ox, oy, oz, dx, ny, dz, far), ex = ox + dx * L, ez = oz + dz * L, ey2 = oy + ny * L;
        if (t < WARN) { c.fx(FX.BEAM, FIRE, ox, oy, oz, 0.012, dx, ny, dz, L, 0.8, 0, 0, 0, seed, 0.03); return true; }
        c.fx(FX.BEAM, FIRE, ox, oy, oz, 0.12, dx, ny, dz, L, 1, 0, 0, 0, seed, 0.3);
        c.fx(FX.BEAM, FIRE, ox, oy, oz, 0.04, dx, ny, dz, L, 1, 0, 0, 0, seed + 0.3, 0.12);
        c.fx(FX.ORB, FIRE, ex, ey2, ez, 0.75, 0, 1, 0, 0, 1, 24, 10, 0, seed);
        c.fx(FX.FLAME, FIRE, ex, sim.world.height(ex, ez), ez, 1.5, 0, 1, 0, 1, 0.85, 0, 0, 0, seed);
        if (scorch <= 0) { scorch = 0.28; patch(sim, FIRE, ex, ez, 0.9, 1.6, 8, 1); }
        // The nearest it comes to you, in plan. Feet above it have cleared it.
        const s = clamp((p.x - ox) * dx + (p.z - oz) * dz, 0, L), nx = ox + dx * s - p.x, nz = oz + dz * s - p.z, beamY = oy + ny * s;
        if (tick <= 0 && Math.hypot(nx, nz) < 0.75 && p.y < beamY + 0.15 && p.y + 1.8 > beamY) { tick = 0.2; strike(sim, p, 10, ox, oz, 1.5, true); }
        return true;
      });
    },
  },

  // Point blank: a clap of force from the hand, for when it has stepped out right behind you.
  thunderclap: {
    how: 'shoot', charge: 0.3, elem: () => ARCANE,
    fire(k, sim, p, d, _, h) {
      const c = sim.casting, a = Math.atan2(p.x - k.x, p.z - k.z), dx = Math.sin(a), dz = Math.cos(a), reach = 8;
      c.burst(FX.SHOCK, ARCANE, h[0], h[1], h[2], 0.2, 2.8, 0.3, { alpha: 1.1 });
      c.burst(FX.BEAM, ARCANE, h[0], h[1], h[2], 0.25, 0.45, 0.3, { ax: dx, ay: 0, az: dz, len: reach, extra: 2.8, alpha: 0.55 });
      c.burst(FX.FLARE, ARCANE, h[0], h[1], h[2], 0.3, 1.5, 0.2, { alpha: 1.2, light: 26, lightR: 8 });
      sim.event(EV.SPELL_BOOM, ARCANE, h[0], h[1], h[2], 3);
      if (d < reach) { strike(sim, p, 20, k.x, k.z, 11); p.vy = Math.max(p.vy, 4.5); }
    },
  },

  // The hole. Comes after you slowly and through anything, and pulls; it bursts when it gets you, or when it's tired. Saved for when the wizard's hurt.
  slowStar: {
    how: 'raise', charge: 0.9, hold: 0.4, big: true, elem: () => VOID,
    fire(k, sim, p, d, _, h) {
      const c = sim.casting, seed = Math.random();
      const b = { x: h[0], y: h[1] + 0.6, z: h[2] };
      let t = 0;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      work(sim, (dt) => {
        t += dt;
        const dx = p.x - b.x, dy = p.y + 1.2 - b.y, dz = p.z - b.z, L = Math.hypot(dx, dy, dz) || 1, grown = smooth(t / 0.7);
        b.x += dx / L * 3 * dt; b.y += dy / L * 3 * dt; b.z += dz / L * 3 * dt;
        if (L < 11 && !p.dead) { const pull = 3.1 * (1 - L / 11) * dt; p.x -= dx / L * pull; p.z -= dz / L * pull; }
        c.fx(FX.VORTEX, VOID, b.x, b.y, b.z, 1.5 * grown, 0, 1, 0, 0, 1, 18 * grown, 9, 0, seed);
        c.fx(FX.ORB, VOID, b.x, b.y, b.z, 0.5 * grown, 0, 1, 0, 0, 0.7, 0, 0, 0, seed);
        if (L < 1.25 || t > 9) { boom(sim, VOID, b.x, b.y, b.z, 5.5, 42, 8); return false; }
        return true;
      });
    },
  },

  // When it can't see you: something sent round the corners after you.
  hound: {
    how: 'shoot', charge: 0.35, elem: () => ARCANE,
    fire(k, sim, p, d, _, h) {
      const c = sim.casting, b = { x: h[0], z: h[2] }, seed = Math.random();
      let t = 0, ax = 0, az = 0;
      sim.event(EV.SPELL_LOOSE, ARCANE, 0, b.x, h[1], b.z);
      work(sim, (dt) => {
        t += dt;
        sim.world.updateField(p.x, p.z, sim.time, 0);
        sim.world.flow(flow, b.x, b.z, p.x, p.z, 0);
        const L = Math.hypot(flow[0], flow[1]) || 1, k2 = 1 - Math.exp(-5 * dt);
        ax += (flow[0] / L - ax) * k2; az += (flow[1] / L - az) * k2;
        b.x += ax * 7.5 * dt; b.z += az * 7.5 * dt;
        const y = sim.world.height(b.x, b.z) + 1.15 + Math.sin(t * 5) * 0.12;
        c.fx(FX.ORB, ARCANE, b.x, y, b.z, 0.2, 0, 1, 0, 0, 1, 12, 7, 0, seed);
        c.fx(FX.TRAIL, ARCANE, b.x, y, b.z, 0.14, -ax, 0, -az, 1.3, 0.85, 0, 0, 0, seed);
        if (Math.hypot(p.x - b.x, p.z - b.z) < 1 || t > 9) { boom(sim, ARCANE, b.x, y, b.z, 2.8, 22, 5); return false; }
        return true;
      });
    },
  },

  // A pane of light that takes the next blows for it, a good deal of them, until it breaks.
  ward: {
    how: 'shoot', charge: 0.2, elem: () => ARCANE,
    fire(k, sim) {
      const c = sim.casting, seed = Math.random();
      k.ward = 55;
      let t = 0;
      c.burst(FX.SHOCK, ARCANE, k.x, k.y + 1.1, k.z, 0.3, 1.6, 0.3, { alpha: 1 });
      sim.event(EV.BLINK, k.x, k.y + 1, k.z);
      work(sim, (dt) => {
        t += dt;
        if (k.dead || k.ward <= 0 || t > 12) {
          k.ward = 0;
          if (!k.dead) { c.burst(FX.SHOCK, ARCANE, k.x, k.y + 1.1, k.z, 1, 2.4, 0.3, { alpha: 1.2, light: 16, lightR: 6 }); sim.event(EV.BLINK, k.x, k.y + 1, k.z); }
          return false;
        }
        c.fx(FX.SHOCK, ARCANE, k.x, k.y + 1.05, k.z, 1.2, 0, 1, 0, 0, 0.4, 3, 3, 0.15 + Math.abs(Math.sin(t * 3)) * 0.2, seed);
        c.fx(FX.RING, ARCANE, k.x, k.y + 0.05, k.z, 1, 0, 1, 0, 0, 0.6, 0, 0, 0.3, seed);
        return true;
      });
    },
  },

  // Having lost you: a pulse off the ground that finds you through walls, if you're close enough.
  reveal: {
    how: 'shoot', charge: 0.5, elem: () => ARCANE,
    fire(k, sim, p) {
      const c = sim.casting, R = 17, y = sim.world.height(k.x, k.z) + 0.1;
      c.burst(FX.RING, ARCANE, k.x, y, k.z, 1, R, 0.9, { alpha: 1.1, ease: 1.6 });
      c.burst(FX.SHOCK, ARCANE, k.x, k.y + 1.1, k.z, 0.5, 3, 0.3, { alpha: 0.9 });
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      if (Math.hypot(p.x - k.x, p.z - k.z) < R) k.findAt(sim);
    },
  },

  // ---- the necromancers' -------------------------------------------------------------------------------------

  // The rite. Hold the hand up, chant, and the dead get up: whoever's lying near first, as they fell, then out of the ground around you.
  graveRite: {
    how: 'raise', charge: 1, hold: 1.1, big: true, ground: true, elem: () => VOID,
    fire(k, sim, p) {
      const c = sim.casting;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      k.minions = k.minions.filter((m) => !m.dead && m.owner === k);
      let want = Math.min(3, 5 - k.minions.length);
      for (const m of sim.corpses(k, 16)) {
        if (want <= 0) break;
        m.raiseAt(sim, m.x, m.z, k);
        k.minions.push(m); want--;
        c.burst(FX.RUNE, VOID, m.x, m.y + 0.03, m.z, 0.4, 1.5, 1.2, { alpha: 0.9, light: 10, lightR: 6 });
        c.burst(FX.COLUMN, VOID, m.x, m.y, m.z, 2.2, 3, 0.6, { alpha: 0.8, len: 0.9 });
      }
      for (; want > 0; want--) {
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * TAU, r = rnd(2.5, 5.5), x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
          if (sim.world.inside(x, z, 0.5)) continue;
          const m = sim.raise(x, z, k);
          if (m) {
            k.minions.push(m);
            c.burst(FX.RUNE, VOID, x, sim.world.height(x, z) + 0.03, z, 0.4, 1.5, 1.2, { alpha: 0.9, light: 10, lightR: 6 });
          }
          break;
        }
      }
    },
  },

  // Bone comes up in a ring round you. There's no way out until it falls, which is a fine time to have the dead get up inside it.
  boneCage: {
    how: 'shoot', charge: 0.5, big: true, elem: () => BONE,
    fire(k, sim, p) {
      const c = sim.casting, x = p.x, z = p.z, R = 3.8, N = 14, seed = Math.random();
      sim.event(EV.SPELL_BOOM, BONE, x, p.y + 0.4, z, 2);
      c.burst(FX.RING, BONE, x, sim.world.height(x, z) + 0.05, z, R * 1.5, R * 0.9, 0.45, { alpha: 1 });
      const draw = (kk, t) => {
        for (let i = 0; i < N; i++) {
          const a = i / N * TAU + 0.11, bx = x + Math.cos(a) * R, bz = z + Math.sin(a) * R, g = sim.world.height(bx, bz);
          // They come up one after another round the ring, and lean in.
          const up = smooth((t - i * 0.016) / 0.22) * kk, tall = 2.5 + 0.7 * Math.abs(Math.sin(i * 12.9 + seed * 9));
          // (A lance is widest near its far end, so it's drawn from the tip down: a tusk, thick where it leaves the ground.)
          const lx = -Math.cos(a) * 0.3, lz = -Math.sin(a) * 0.3, reach = tall * up + 0.02;
          c.fx(FX.LANCE, BONE, bx + lx * reach, g - 0.25 + reach, bz + lz * reach, 0.17, -lx, -1, -lz, reach, 1, i === 0 ? 5 : 0, 7, 0, seed + i * 0.17);
        }
      };
      draw.elem = BONE;
      fence(sim, x, z, R, 5, 0.3, 11, draw);
      k.caged = { x, z, until: sim.time + 5 };
    },
  },

  // A furrow of bone torn up along the ground towards you, turning after you as it comes. Step aside at the last moment.
  boneFurrow: {
    how: 'shoot', charge: 0.3, elem: () => BONE,
    fire(k, sim, p) {
      const c = sim.casting, seed = Math.random(), planted = [];
      let x = k.x + Math.sin(k.yaw) * 0.9, z = k.z + Math.cos(k.yaw) * 0.9, a = Math.atan2(p.x - x, p.z - z), gone = 0, nextAt = 0, done = false;
      sim.event(EV.SPELL_LOOSE, BONE, 0, x, k.y + 0.3, z);
      work(sim, (dt) => {
        if (!done) {
          const step = 11 * dt, want = Math.atan2(p.x - x, p.z - z), turnBy = ((want - a + Math.PI * 3) % TAU) - Math.PI;
          a += clamp(turnBy, -0.85 * dt, 0.85 * dt);
          x += Math.sin(a) * step; z += Math.cos(a) * step; gone += step;
          if (gone >= nextAt) {
            nextAt = gone + 0.62;
            planted.push({ x, z, t: 0, y: sim.world.height(x, z), lean: rnd(-0.3, 0.3), tall: rnd(0.9, 1.5) });
            sim.event(EV.DIRT, x, sim.world.height(x, z), z, 0.3);
          }
          const near = Math.hypot(p.x - x, p.z - z);
          if (near < 0.95 && p.y - sim.world.height(x, z) < 1) {
            done = true;
            strike(sim, p, 22, x, z, 3, true);
            p.vy = Math.max(p.vy, 6.5);
            sim.event(EV.SPELL_BOOM, BONE, x, p.y + 0.5, z, 2);
          } else if (gone > 26 || sim.world.inside(x, z, 0.1)) done = true;
        }
        for (const s of planted) s.t += dt;
        while (planted.length && planted[0].t > 1) planted.shift();
        for (let i = 0; i < planted.length; i++) {
          const s = planted[i], kk = smooth(s.t / 0.1) * smooth((1 - s.t) / 0.3);
          const reach = s.tall * kk + 0.02;
          c.fx(FX.LANCE, BONE, s.x + s.lean * reach, s.y - 0.2 + reach, s.z - s.lean * 0.6 * reach, 0.16, -s.lean, -1, s.lean * 0.6, reach, 1, 0, 0, 0, seed + i * 0.13);
        }
        return !done || planted.length > 0;
      });
    },
  },

  // A red thread to your chest, and your life goes back along it into the necromancer. Only a wall or a hard blow breaks it.
  soulLeech: {
    how: 'raise', charge: 0.3, hold: 3.8, ends: true, elem: () => DRAIN,
    fire(k, sim, p, d, token) {
      const c = sim.casting, seed = Math.random();
      let tick = 0;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      work(sim, (dt) => {
        tick -= dt;
        if (!token.live || k.dead || p.dead) return false;
        const h = k.handAt();
        if (Math.hypot(p.x - k.x, p.z - k.z) > 26 || !sim.world.sees(h[0], h[1], h[2], p.x, p.y + 1.2, p.z)) { token.end = true; return false; }
        thread(c, DRAIN, p.x, p.y + 1, p.z, h[0], h[1], h[2], 0.05, seed, 4);
        c.fx(FX.FLARE, DRAIN, h[0], h[1], h[2], 0.35, 0, 1, 0, 0, 1, 8, 5, 0.5, seed);
        if (tick <= 0) {
          tick = 0.3;
          if (strike(sim, p, 3.5, k.x, k.z, 0, true)) k.hp = Math.min(k.maxHp, k.hp + 10);
          k.seenHp = k.hp;
        }
        return true;
      });
    },
  },

  // Wraiths by the handful, let go in a stream, that wheel and come at you from all sides.
  wraiths: {
    how: 'raise', charge: 0.3, hold: 1.5, elem: (k) => k.opts.boltElem,
    fire(k, sim, p, d, token) {
      const elem = k.opts.boltElem;
      let left = 6, nextT = 0;
      work(sim, (dt) => {
        nextT -= dt;
        if (left > 0 && nextT <= 0 && token.live) {
          nextT = 0.24;
          const h = k.handAt(), a = Math.atan2(p.x - h[0], p.z - h[2]) + (left % 2 ? 1 : -1) * rnd(0.8, 1.5);
          shot(sim, { elem, x: h[0], y: h[1], z: h[2], dx: Math.sin(a), dy: rnd(0.15, 0.7), dz: Math.cos(a), speed: 9.5, dmg: 7, size: 0.16, home: 2.3, homeFor: 1.8, life: 4.5 });
          left--;
        }
        return left > 0 && token.live;
      });
    },
  },

  // It marks one of its own, or a body on the ground. A marked one runs at you, and a moment later there's nothing left of it but bone in the air.
  corpseBomb: {
    how: 'shoot', charge: 0.25, big: true, elem: () => BONE,
    fire(k, sim, p, d, token, h, target) {
      if (!target) return;
      const c = sim.casting, seed = Math.random();
      thread(c, BONE, h[0], h[1], h[2], target.x, target.y + 1, target.z, 0.05, seed);
      let t = 0;
      const fuse = target.dead ? 1 : 2.4;
      target.doomed = true;
      if (!target.dead) target.rush = fuse + 0.5;
      sim.event(EV.SPELL_LOOSE, BONE, 0, target.x, target.y + 1, target.z);
      work(sim, (dt) => {
        t += dt;
        const kk = t / fuse, y = target.y + (target.dead ? 0.25 : 1);
        c.fx(FX.ORB, BONE, target.x, y, target.z, 0.4 + 0.45 * kk + 0.12 * Math.sin(t * (12 + 26 * kk)), 0, 1, 0, 0, 0.75, 9 + 18 * kk, 6, 0, seed);
        c.fx(FX.RUNE, BONE, target.x, sim.world.height(target.x, target.z) + 0.03, target.z, 3, 0, 1, 0, 0, 0.4 + kk * 0.8, 0, 0, kk, seed);
        if (t < fuse) return true;
        target.doomed = false;
        boom(sim, BONE, target.x, y, target.z, 3.6, 36, 7);
        if (!target.dead) target.hp = 0;
        target.burst(sim);
        return false;
      });
    },
  },

  // One of its own gives back everything it was given. The necromancer gets up from nearly anything this way, if there's a body to hand.
  reap: {
    how: 'raise', charge: 0.15, hold: 1.25, ends: true, elem: () => DRAIN,
    fire(k, sim, p, d, token, h, target) {
      if (!target) { token.end = true; return; }
      const c = sim.casting, seed = Math.random();
      let t = 0;
      sim.event(EV.GROAN, target.x, target.y + 1.5, target.z, 1);
      work(sim, (dt) => {
        t += dt;
        if (!token.live || k.dead || target.dead) return false;
        const at = k.handAt();
        thread(c, DRAIN, target.x, target.y + 1, target.z, at[0], at[1], at[2], 0.09, seed, 5);
        if (t < 1.15) return true;
        target.hp = 0;
        target.burst(sim);
        k.hp = Math.min(k.maxHp, k.hp + k.maxHp * 0.3); k.seenHp = k.hp;
        c.burst(FX.COLUMN, DRAIN, k.x, k.y, k.z, 2.4, 3.2, 0.5, { len: 0.9, alpha: 0.85, light: 18, lightR: 7 });
        sim.event(EV.SPELL_HIT, DRAIN, k.x, k.y + 1, k.z, 10);
        return false;
      });
    },
  },

  // The plague-bearer's. Thrown overarm, in an arc, to where you'll be. It breaks into a cloud that stays.
  flask: {
    how: 'lob', elem: () => POISON,
    fire(k, sim, p, d, _, h) {
      const c = sim.casting, g = 13, T = clamp(d / 13, 0.45, 1.3), [tx, tz] = lead(p, T * 0.7), ty = sim.world.height(tx, tz), seed = Math.random();
      const b = { x: h[0], y: h[1], z: h[2], vx: (tx - h[0]) / T, vy: (ty - h[1]) / T + g * T / 2, vz: (tz - h[2]) / T };
      let t = 0;
      sim.event(EV.SPELL_LOOSE, POISON, 0, b.x, b.y, b.z);
      work(sim, (dt) => {
        t += dt;
        b.vy -= g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        c.fx(FX.FLASK, POISON, b.x, b.y, b.z, 0.085, Math.sin(t * 13), Math.cos(t * 13), 0.2, 0.32, 1, 4, 5, 0, seed);
        if (b.y > sim.world.height(b.x, b.z) && !sim.world.inside(b.x, b.z, 0.05) && t < 3) return true;
        boom(sim, POISON, b.x, b.y + 0.2, b.z, 2.6, 12, 1);
        patch(sim, POISON, b.x, b.z, 3.3, 7, 12, 4);
        return false;
      });
    },
  },

  // The ground comes up green under you, in a line of blooms that follow you. Each gives a moment's warning.
  bloom: {
    how: 'raise', charge: 0.4, hold: 1.8, big: true, ground: true, elem: () => POISON,
    fire(k, sim, p, d, token) {
      const c = sim.casting;
      let left = 5, nextT = 0;
      work(sim, (dt) => {
        nextT -= dt;
        if (left > 0 && nextT <= 0 && token.live) {
          left--; nextT = 0.42;
          const [lx, lz] = lead(p, 0.75), x = lx + rnd(-0.6, 0.6), z = lz + rnd(-0.6, 0.6), y = sim.world.height(x, z), R = 2.3, seed = Math.random();
          let u = 0;
          work(sim, (ds) => {
            u += ds / 0.8;
            c.fx(FX.RUNE, POISON, x, y + 0.03, z, R, 0, 1, 0, 0, 0.5 + u * 0.6, 3 + 8 * u, 5, u, seed);
            if (u < 1) return true;
            c.burst(FX.COLUMN, POISON, x, y, z, 3.4, 4.6, 0.5, { len: 1.5, alpha: 1 });
            c.burst(FX.SHOCK, POISON, x, y + 0.4, z, 0.4, 2.4, 0.35, { alpha: 1, light: 16, lightR: 7 });
            sim.event(EV.SPELL_BOOM, POISON, x, y + 0.5, z, 1.5);
            if (Math.hypot(p.x - x, p.z - z) < R && Math.abs(p.y - y) < 1.6) { strike(sim, p, 17, x, z, 0, true); p.vy = Math.max(p.vy, 4.5); }
            patch(sim, POISON, x, z, 1.8, 3.5, 7, 1);
            return false;
          });
        }
        return left > 0 && token.live;
      });
    },
  },

  // A cloud that hunts. It can't catch a runner, and it doesn't stop.
  locusts: {
    how: 'shoot', charge: 0.4, big: true, elem: () => POISON,
    fire(k, sim, p, d, _, h) {
      const c = sim.casting, b = { x: h[0], z: h[2] }, seed = Math.random();
      let t = 0, tick = 0;
      sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
      work(sim, (dt) => {
        t += dt; tick -= dt;
        if (t > 9 || k.dead) return false;
        const dx = p.x - b.x, dz = p.z - b.z, L = Math.hypot(dx, dz) || 1;
        b.x += dx / L * 3.6 * dt; b.z += dz / L * 3.6 * dt;
        const y = sim.world.height(b.x, b.z) + 1.1, kk = smooth(t / 0.5) * smooth((9 - t) / 0.8);
        for (let i = 0; i < 4; i++) {
          const a = i * 1.57 + t * (1.6 + i * 0.3), r = 0.9 + Math.sin(t * 1.3 + i) * 0.5;
          c.fx(FX.PUFF, POISON, b.x + Math.cos(a) * r, y + Math.sin(t * 2 + i) * 0.45, b.z + Math.sin(a) * r, 1.15, 0, 1, 0, 0, 0.62 * kk, i === 0 ? 5 : 0, 4, 0, seed + i * 0.3);
        }
        if (tick <= 0 && L < 2.1) { tick = 0.4; strike(sim, p, 5, b.x, b.z, 0, true); }
        return true;
      });
    },
  },

  // A rotten wave going out along the ground from the feet. Be in the air when it comes past.
  rotWave: {
    how: 'shoot', charge: 0.55, big: true, elem: () => POISON,
    fire(k, sim, p) {
      const c = sim.casting, x = k.x, z = k.z, y = sim.world.height(x, z) + 0.08, seed = Math.random(), R = 16;
      let r = 0.8, hit = false;
      sim.event(EV.SPELL_BOOM, POISON, x, y + 0.5, z, 3);
      c.burst(FX.SHOCK, POISON, x, y + 1, z, 0.4, 3, 0.35, { alpha: 1 });
      work(sim, (dt) => {
        r += 8.5 * dt;
        if (r > R) return false;
        const kk = 1 - r / R * 0.75, g = sim.world.height(p.x, p.z);
        c.fx(FX.RING, POISON, x, y, z, r, 0, 1, 0, 0, kk, 8 * kk, r + 2, r / R * 0.7, seed);
        c.fx(FX.RING, POISON, x, y, z, Math.max(0.5, r - 0.8), 0, 1, 0, 0, kk * 0.6, 0, 0, r / R * 0.7, seed + 0.3);
        if (!hit && Math.abs(Math.hypot(p.x - x, p.z - z) - r) < 0.65 && p.y - g < 0.45) { hit = true; strike(sim, p, 19, x, z, 5, true); p.vy = Math.max(p.vy, 4); }
        return true;
      });
    },
  },
};

// What's left when a necromancer falls: whoever was lying near gets up a last time. A wizard goes in one last burst of everything it was holding.
export function lastRite(k, sim) {
  if (k.opts.role === 'wizard') {
    let t = 0;
    const c = sim.casting, x = k.x, y = k.y + 1, z = k.z, seed = Math.random();
    work(sim, (dt) => {
      t += dt;
      c.fx(FX.VORTEX, ARCANE, x, y, z, 1.4 * (1 - t * 0.75), 0, 1, 0, 0, 1, 20, 8, 0, seed);
      if (t < 1) return true;
      boom(sim, ARCANE, x, y, z, 5, 24, 7);
      return false;
    });
    return;
  }
  const c = sim.casting;
  c.burst(FX.COLUMN, VOID, k.x, k.y, k.z, 3, 5, 0.8, { len: 1.1, alpha: 0.9, light: 22, lightR: 9 });
  sim.event(EV.CHANT, k.x, k.y + 1.5, k.z);
  let n = 2;
  for (const m of sim.corpses(k, 13)) {
    if (n-- <= 0) break;
    m.raiseAt(sim, m.x, m.z, null);
    c.burst(FX.RUNE, VOID, m.x, m.y + 0.03, m.z, 0.4, 1.5, 1.2, { alpha: 0.9, light: 10, lightR: 6 });
  }
}

export function stepFoeWorks(dt, sim) {
  if (!sim.foeWorks.length) return;
  sim.casting.clock = sim.time;
  const now = sim.foeWorks;
  sim.foeWorks = [];
  for (const w of now) if (w(dt)) sim.foeWorks.push(w);
}
