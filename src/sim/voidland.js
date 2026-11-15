// The Elder Gods' void on the sim thread (src/core/delve-elder.js, src/core/dungeon.js 'void'): what's particular to
// islands hanging over nothing, run by the Warrens each tick you're in it (src/sim/dungeon.js step).
//
//   A fall. The player who goes over an edge (a jump, or thrown) falls; a few metres down the Rift throws them back up onto
//   the ground they last stood on, a fifth of their life the poorer and slowed for three seconds (void-sickness). It never
//   kills on its own. A fight may say where a fall lands instead (spec.fallTo: the islets under the Galeward).
//   A leap. Anyone carried through the air from one place to another on an arc (leap(), below): a gust stone's throw, a
//   god's blow that throws you off the disc, the hired party jumping between islands. Nothing else moves them meanwhile.
//   Gust stones (delve LEAPS): stood on, they throw you to their other end.
//   The seals across the Scale Altar's bridges: each holds till the god before it is dead.
//   The party on another island than where it means to be (its order, the boss, or you) jumps across, as a hero can.
import { EV } from '../core/layout.js';
import { BOSSES, VOID, WARN, caveFloorY, caveRoom, roomOf, toWorld } from '../core/dungeon.js';
import { SEALS } from '../core/delve-elder.js';
import { clamp } from '../core/math.js';
import { ELEM, FX } from './spells.js';

// Carried through the air from where it is to (x, z): over `secs` seconds, rising `apex` metres over the straight line
// between its two heights. then(): once it's down. (Anyone: the player, a hero, a monster.)
export function leap(W, b, x, z, o = {}) {
  const sim = W.sim, L = Math.hypot(x - b.x, z - b.z), y1 = caveFloorY(x, z);
  const secs = o.secs ?? clamp(0.6 + L / 14, 0.75, 2.6), apex = o.apex ?? Math.max(1.6, 1.4 + L * 0.1 + Math.max(0, y1 - b.y) * 0.4);
  b.leaping = { t: 0, secs, x0: b.x, z0: b.z, y0: b.y, x1: x, z1: z, y1, apex, then: o.then || null, hurt: o.hurt || 0 };
  if (b === sim.player) { b.onGround = false; b.surfing = false; b.vy = 0; }
  sim.event(EV.JUMP, b.x, b.y, b.z, 1);
  return b.leaping;
}

// The island a point is on (a number), or -1 in the void: the field's open cells, flood-filled, a metre at a time.
function islands(W, d) {
  if (d.islandMap) return d.islandMap;
  const nav = W.sim.world.caveNav(d.x + d.entry.x, d.z + d.entry.z), N = nav.W * nav.H, lab = new Int16Array(N).fill(-1), q = new Int32Array(N);
  let n = 0;
  for (let k = 0; k < N; k++) {
    if (nav.block[k] || lab[k] >= 0) continue;
    let h = 0, t = 0;
    q[t++] = k; lab[k] = n;
    while (h < t) {
      const c = q[h++], i = c % nav.W, j = (c / nav.W) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= nav.W || nj >= nav.H) continue;
        const nk = nj * nav.W + ni;
        if (nav.block[nk] || lab[nk] >= 0) continue;
        lab[nk] = n; q[t++] = nk;
      }
    }
    n++;
  }
  return (d.islandMap = { nav, lab, n });
}
export function islandOf(W, x, z) {
  const d = W.delve, m = islands(W, d), nav = m.nav;
  const i = Math.floor((x - nav.x0) / nav.cell), j = Math.floor((z - nav.z0) / nav.cell);
  if (i < 0 || j < 0 || i >= nav.W || j >= nav.H) return -1;
  const v = m.lab[j * nav.W + i];
  if (v >= 0) return v;
  // (A body pressed against an edge stands on a shut cell: the nearest open one round it.)
  for (let r = 1; r <= 2; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < nav.W && b < nav.H && m.lab[b * nav.W + a] >= 0) return m.lab[b * nav.W + a];
  }
  return -1;
}
// A spot on the island at (x, z), near it and a stride or two in from the edge: where a leap toward there comes down.
export function landing(W, x, z, inset = 1.8) {
  if (caveRoom(x, z) >= inset) return [x, z];
  for (let k = 0; k < 24; k++) {
    const e = 0.3, gx = caveRoom(x + e, z) - caveRoom(x - e, z), gz = caveRoom(x, z + e) - caveRoom(x, z - e), L = Math.hypot(gx, gz) || 1;
    const step = Math.max(0.3, inset - caveRoom(x, z));
    x += gx / L * step; z += gz / L * step;
    if (caveRoom(x, z) >= inset) break;
  }
  return [x, z];
}

// Each tick in the void.
export function voidStep(W, dt) {
  const sim = W.sim, p = sim.player, d = W.delve, now = sim.time;
  const party = W.party().filter((h) => !h.dead && h.active), bodies = [p, ...party];
  // ---- the leaps under way ----
  for (const b of bodies) {
    const j = b.leaping;
    if (!j) continue;
    // (Fallen mid-throw: no more of it.)
    if (b.dead) { b.leaping = null; continue; }
    j.t += dt;
    const u = Math.min(1, j.t / j.secs), s = u * u * (3 - 2 * u) * 0.25 + u * 0.75;
    b.x = j.x0 + (j.x1 - j.x0) * s; b.z = j.z0 + (j.z1 - j.z0) * s;
    b.y = j.y0 + (j.y1 - j.y0) * u + j.apex * 4 * u * (1 - u);
    b.vx = 0; b.vz = 0;
    if (b === p) { b.vy = 0; b.onGround = false; } else { b.goal = null; b.stuckT = 0; b.lastX = b.x; b.lastZ = b.z; }
    if (u >= 1) {
      b.leaping = null; b.y = j.y1;
      if (b === p) { b.onGround = true; b.vy = 0; sim.event(EV.LAND, b.x, b.y, b.z, 0.6); }
      sim.event(EV.STEP, b.x, b.y, b.z, 1, 0, -1);
      if (j.hurt) sim.perils.hurt(b, j.hurt, b.x, b.z, 0, false, 'thrown');
      j.then?.(b);
    }
  }
  // ---- the player's fall ----
  if (!p.dead && !p.leaping) {
    const ground = caveFloorY(p.x, p.z), open = caveRoom(p.x, p.z);
    // (Where they last stood on firm ground, well in from an edge: where the Rift puts them back.)
    if (p.onGround && open > 1.6 && Math.abs(p.y - ground) < 0.3) { p.voidSafe = p.voidSafe || [0, 0]; p.voidSafe[0] = p.x; p.voidSafe[1] = p.z; }
    if (open < -VOID.lip && p.y < ground - 7) {
      const f = W.fight, spec = f?.spec, to = spec?.fallTo?.(W, f, p) || p.voidSafe || [d.x + d.entry.x, d.z + d.entry.z];
      const [x, z] = landing(W, to[0], to[1], 2);
      sim.event(EV.BLINK, p.x, p.y + 1, p.z);
      W.put(p, x, z, p.yaw);
      p.hp = Math.max(1, p.hp - p.maxHp * 0.2); p.regenT = 0;
      p.miredUntil = now + 3;
      sim.event(EV.HURT, p.x, p.y + 1, p.z, 1);
      sim.event(EV.BLINK, p.x, p.y + 1, p.z);
      sim.casting.burst(FX.RING, ELEM.VOID, p.x, p.y + 0.15, p.z, 0.6, 2.4, 0.5, { light: 6, lightR: 6 });
      W.warn(WARN.ed_fall, 6);
      if (f) f.falls = (f.falls || 0) + 1;
    }
  }
  // ---- the gust stones (the player's: the party jumps across of its own accord, below) ----
  for (const b of [p]) {
    if (b.dead || b.leaping || (b.gustCd = (b.gustCd || 0) - dt) > 0 || !p.onGround) continue;
    for (const l of d.leaps || []) {
      for (const [a, c, back] of [[l.from, l.to, false], [l.to, l.from, true]]) {
        if (back && l.one) continue;
        const ax = d.x + a[0], az = d.z + a[1];
        if (Math.hypot(b.x - ax, b.z - az) > 1.3 || Math.abs(b.y - caveFloorY(ax, az)) > 1) continue;
        // (A fight may still a stone a while: the Galeward's updrafts, while Thyrraxis hunts you round the islets.)
        if (W.fight?.spec?.gust && !W.fight.spec.gust(W, W.fight, l, back)) continue;
        b.gustCd = 1.2;
        leap(W, b, d.x + c[0], d.z + c[1], { apex: 3 + Math.abs(caveFloorY(d.x + c[0], d.z + c[1]) - b.y) * 0.5 });
        sim.casting.burst(FX.RING, ELEM.STORM, ax, b.y + 0.2, az, 0.6, 2.2, 0.4, { light: 5, lightR: 6 });
        break;
      }
      if (b.leaping) break;
    }
  }
  // ---- the seals ----
  for (const s of SEALS) {
    // (Shown, or gone once the god before it is dead: scenery that comes and goes, src/core/delve-build.js voidseal.)
    const key = `${d.tag}_seal_${s.key}`, open = !s.after || W.down.has(s.after);
    if (open !== W.flipped.has(key) && s.after) W.flip(key, open);
    if (open) continue;
    const [sx, sz] = toWorld(s.at[0], s.at[1], d), alt = roomOf('ed_altar'), ax = d.x + alt.x, az = d.z + alt.z;
    for (const b of bodies) {
      const L = Math.hypot(b.x - sx, b.z - sz);
      if (L > 3.2 || b.leaping) continue;
      // (Back toward the altar's middle, out of the bridge's mouth.)
      const dx = ax - sx, dz = az - sz, l = Math.hypot(dx, dz) || 1;
      b.x = sx + dx / l * 3.3; b.z = sz + dz / l * 3.3; b.vx = 0; b.vz = 0;
      if (b === p) W.warn(WARN.ed_sealed, 6);
    }
  }
  // ---- the party, across to where it means to be ----
  const f = W.fight, boss = f ? W.bossBodies(f.boss.key).find((m) => !m.dead) : null;
  for (const h of party) {
    if (h.leaping) { h.hopT = 0; continue; }
    const o = W.order(h);
    let tx, tz;
    if (o?.to) [tx, tz] = o.to;
    else if (boss && !boss.flying && f) { tx = boss.x; tz = boss.z; }
    else { tx = p.x; tz = p.z; }
    const mine = islandOf(W, h.x, h.z), theirs = islandOf(W, tx, tz);
    h.hopTo = mine !== theirs && theirs >= 0 ? theirs : undefined;
    if (h.hopTo === undefined) { h.hopT = 0; continue; }
    // (A moment's look first, so a hero doesn't jump the instant you do; then straight across, as near the goal as there's ground.)
    if ((h.hopT = (h.hopT || 0) + dt) < (o?.urgent ? 0.4 : 1.1) || h.jump || h.surf) continue;
    h.hopT = 0;
    const L = Math.hypot(tx - h.x, tz - h.z), far = Math.min(L, 44), gx = h.x + (tx - h.x) / L * far, gz = h.z + (tz - h.z) / L * far;
    // (Not onto the goal itself, if it's a body: a stride short of it.)
    const short = o?.to ? 0 : Math.min(far, 3.5), [lx, lz] = landing(W, h.x + (tx - h.x) / L * (far - short), h.z + (tz - h.z) / L * (far - short), 1.5);
    if (islandOf(W, lx, lz) !== theirs && far >= L) continue;
    leap(W, h, lx, lz);
    void gx; void gz;
  }
}

// The way to an order's place on another island than a body's own (the player's: the party jumps the gap of its own
// accord): the gust stone on this island that throws you there, or failing one, the one that lands you nearest it.
export function route(W, b, o) {
  if (!o?.to || b.leaping) return o;
  const d = W.delve, here = islandOf(W, b.x, b.z), there = islandOf(W, o.to[0], o.to[1]);
  if (here < 0 || there < 0 || here === there) return o;
  const f = W.fight;
  let best = null, bd = Infinity;
  for (const l of d.leaps || []) for (const [a, c, back] of [[l.from, l.to, false], [l.to, l.from, true]]) {
    if (back && l.one) continue;
    if (f?.spec?.gust && !f.spec.gust(W, f, l, back)) continue;
    const ax = d.x + a[0], az = d.z + a[1], cx = d.x + c[0], cz = d.z + c[1];
    if (islandOf(W, ax, az) !== here) continue;
    const score = (islandOf(W, cx, cz) === there ? 0 : 1000) + Math.hypot(cx - o.to[0], cz - o.to[1]);
    if (score < bd) { bd = score; best = [ax, az]; }
  }
  return best ? { ...o, to: best, urgent: true } : o;
}

// Thrown off: up and out over the edge, toward (dx, dz) (the player; their own fall does the rest), or for a hero the leap
// to wherever the fight says a fall lands.
export function blowOff(W, b, dx, dz, speed = 9) {
  const sim = W.sim, L = Math.hypot(dx, dz) || 1;
  if (b === sim.player) {
    if (b.leaping) return;
    b.vx = dx / L * speed; b.vz = dz / L * speed; b.vy = 4.2; b.onGround = false; b.surfing = false; b.y += 0.6;
    return;
  }
  const f = W.fight, to = f?.spec?.fallTo?.(W, f, b) || [b.x - dx / L * 4, b.z - dz / L * 4];
  const [x, z] = landing(W, to[0], to[1], 2);
  leap(W, b, x, z, { apex: 5, hurt: b.maxHp * 0.15 });
}
void BOSSES;
