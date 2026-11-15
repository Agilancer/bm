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
import { SEALS, STARS } from '../core/delve-elder.js';
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
      // (Where a fight says a fall is the end of you: the last Devour's pull into the Maw.)
      if (spec?.lethalFall?.(W, f, p)) { sim.perils.hurt(p, p.maxHp * 20, p.x, p.z, 0, false, 'maw'); sim.casting.burst(FX.VORTEX, ELEM.VOID, p.x, p.y + 1, p.z, 1, 5, 0.8, { light: 8, lightR: 8 }); return; }
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
  gates(W);
  spanWhelps(W);
  if (!W.fight) gateDrakes(W, dt);
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
  const f = W.fight;
  if (f?.spec?.lethalFall?.(W, f, b)) { sim.perils.hurt(b, b.maxHp * 20, b.x, b.z, 0, false, 'maw'); sim.casting.burst(FX.VORTEX, ELEM.VOID, b.x, b.y + 1, b.z, 1, 5, 0.8); return; }
  const to = f?.spec?.fallTo?.(W, f, b) || [b.x - dx / L * 4, b.z - dz / L * 4];
  const [x, z] = landing(W, to[0], to[1], 2);
  leap(W, b, x, z, { apex: 5, hurt: b.maxHp * 0.15 });
}
void BOSSES;

// ---- what's met on the way ----------------------------------------------------------------------------------------------------
// Each god's first words as you come out onto its stair, its island in sight across the last bridge (once in a while).
const GATE_OF = { thyrraxis: 'ed_galegate', kaldurra: 'ed_cindergate', morvekh: 'ed_rimegate', nihvaroth: 'ed_mawgate' };
function gates(W) {
  const sim = W.sim, p = sim.player, d = W.delve;
  if (W.fight || p.dead || (sim.tick & 15) !== 0) return;
  for (const b of BOSSES) {
    const room = GATE_OF[b.key] && roomOf(GATE_OF[b.key]);
    if (!room || b.delve !== d.key || W.down.has(b.key) || (b.needs && !b.needs.every((k) => W.down.has(k)))) continue;
    if (Math.hypot(p.x - d.x - room.x, p.z - d.z - room.z) > room.r) continue;
    const told = (d.told ||= {});
    if (sim.time - (told[b.key] ?? -1e9) < 300) continue;
    told[b.key] = sim.time;
    const id = WARN[`${b.key}_say_intro_0`];
    if (id !== undefined) W.warn(id);
  }
}
// The Span's whelps: down under the bridge's two sides, out of sight, till you're out on its middle; then up over its edges.
function spanWhelps(W) {
  const sim = W.sim, t = sim.tripo, p = sim.player, d = W.delve, room = roomOf('ed_span');
  if (!t || !room) return;
  const l = t.lairs.find((q) => q.dungeon && q.key === 'ed_span' && q.delve === d.key);
  if (!l) return;
  const them = t.slots().filter((k) => k.lair === l && !k.dead);
  if (!them.length) { l.ambush = null; return; }
  const cx = d.x + room.x, cz = d.z + room.z;
  // (Either side of the way across, square to it: the bridge runs north and south.)
  const spot = (i) => [cx + (i % 2 ? 1 : -1) * (room.r + 5), cz + (i >> 1) * 4 - 2];
  if (l.ambush === 'done') return;
  l.ambush = 'hid';
  // (Each as it's stood up, out of sight under the edge: buried, held still, nothing to strike.)
  them.forEach((k, i) => { if (k.spanHid) return; k.spanHid = true; const [x, z] = spot(i); k.buried = true; k.noTurn = true; k.aggro = false; k.free = true; k.x = x; k.z = z; k.vx = 0; k.vz = 0; k.script = () => true; });
  if (p.dead || Math.hypot(p.x - cx, p.z - cz) > 5.5) return;
  l.ambush = 'done';
  sim.event(EV.ROAR, cx, sim.world.height(cx, cz) + 1, cz, 1);
  W.warn(WARN.ed_span, 30);
  them.forEach((k, i) => {
    const side = i % 2 ? 1 : -1, along = (i >> 1) * 4 - 2, from = spot(i), to = landing(W, cx + side * 2.4, cz + along * 0.6, 1.4);
    let u = 0;
    k.buried = false; k.free = true; k.x = from[0]; k.z = from[1]; k.vx = 0; k.vz = 0;
    if (k.rig.clips.fly) k.setClip('fly');
    k.script = (q, dt) => {
      u = Math.min(1, u + dt / 1.3);
      const s = u * u * (3 - 2 * u);
      q.x = from[0] + (to[0] - from[0]) * s; q.z = from[1] + (to[1] - from[1]) * s; q.vx = 0; q.vz = 0;
      q.liftExtra = q.hover = -9 * (1 - u) * (1 - u) + 8 * u * (1 - u);
      q.yaw = Math.atan2(p.x - q.x, p.z - q.z);
      if (u < 1) return true;
      q.script = null; q.free = false; q.noTurn = false; q.liftExtra = 0; q.hover = 0; q.aggro = true; q.state = 0;
      sim.event(EV.GROUND, q.x, q.y, q.z);
      return false;
    };
  });
}
// The drakes at the four stairs, each a small piece of its god's fight, a few times while it lives: Thyrraxis's a beat of
// its wings that drives you toward the stair's edge; Kaldurra's a lava wave to jump; Morvekh's a grasp toward the edge but
// beside the rime there; Nihvaroth's a pull toward the Maw but in its well.
const DRAKE_MOVE = { ed_galegate: 'gale', ed_cindergate: 'wave', ed_rimegate: 'grasp', ed_mawgate: 'pull' };
function gateDrakes(W, dt) {
  const sim = W.sim, t = sim.tripo, P = sim.perils, now = sim.time;
  if (!t) return;
  for (const k of t.slots()) {
    const kind = k.lair?.dungeon && k.lair.delve === W.delve.key && DRAKE_MOVE[k.lair.key];
    if (!kind || k.dead || !k.aggro || !/^ed_drake_/.test(k.opts.model || '')) continue;
    const g = k.gateMove;
    if (g) {
      if (now > g.until) { k.gateMove = null; continue; }
      if (now < g.at) continue;
      for (const b of W.bodies()) {
        if (b.leaping || b.dead || Math.hypot(b.x - k.x, b.z - k.z) > 22) continue;
        let dx, dz, v;
        if (kind === 'gale') { dx = b.x - k.x; dz = b.z - k.z; v = 3.4; }
        else if (kind === 'grasp') {
          if (W.delve.props.some((q) => q.kind === 'rime' && Math.hypot(W.delve.x + q.x - b.x, W.delve.z + q.z - b.z) < 3.4)) continue;
          const e = 0.4; dx = -(caveRoom(b.x + e, b.z) - caveRoom(b.x - e, b.z)); dz = -(caveRoom(b.x, b.z + e) - caveRoom(b.x, b.z - e)); v = 2.4;
        } else {
          if (g.well && Math.hypot(b.x - g.well.x, b.z - g.well.z) < g.well.r) continue;
          dx = 0.12; dz = -1; v = 2.8;
        }
        const L = Math.hypot(dx, dz) || 1, nx = b.x + dx / L * v * dt, nz = b.z + dz / L * v * dt;
        if (caveRoom(nx, nz) < 1.0) { blowOff(W, b, dx, dz, 8); continue; }
        b.x = nx; b.z = nz;
      }
      continue;
    }
    if ((k.gateCd = (k.gateCd ?? 6) - dt) > 0 || k.state !== 0 || k.script) continue;
    k.gateCd = 12;
    const dmg = k.opts.damage || 100;
    if (kind === 'wave') {
      if (!k.perform({ clip: 'claw_slam', secs: 1.6, at: 0.9 })) continue;
      W.warn(WARN.ed_drake_wave, 12);
      P.later(0.9, () => { if (!k.dead) P.wave(k.x, k.z, { speed: 8, reach: 20, band: 1.1, r: 1.6, touch: dmg * 0.8, knock: 3, elem: ELEM.FIRE, jump: true, tag: 'rings' }); });
      continue;
    }
    if (!k.perform({ clip: kind === 'gale' ? 'wing_buffet' : 'roar', secs: 2.6, at: 0 })) continue;
    k.gateMove = { at: now + 1.2, until: now + 3.6 };
    if (kind === 'pull') {
      // (Its well a few strides off to the south of it, away from the Maw.)
      const [wx, wz] = landing(W, k.x - 0.12 * 5, k.z + 5, 2);
      k.gateMove.well = P.mark({ x: wx, z: wz, r: 2.6, fuse: 1.2, life: 2.6, soak: true, elem: ELEM.LIGHT, tag: 'well' });
    }
    W.warn({ gale: WARN.ed_drake_gale, grasp: WARN.ed_drake_grasp, pull: WARN.ed_drake_pull }[kind], 12);
  }
}

// ---- what's drawn of it each tick (src/sim/dungeon.js drawFx: after the spells' update has cleared the frame) ----------
// The gust stones: an updraft of pale wind standing over each that will throw you, and a chevron walking out along the
// ground toward where it throws you; one a fight has stilled shows a dim red ring instead. The four scales round the altar,
// each alight in its god's colour till that god is dead. The Lip's star sockets, dim, where the wells come down in a Devour.
const TAU = Math.PI * 2;
const SCALE_GOD = { green: ['thyrraxis', ELEM.HEAL], red: ['kaldurra', ELEM.FIRE], undead: ['morvekh', ELEM.FROST], black: ['nihvaroth', ELEM.VOID] };
export function voidDraw(W) {
  const sim = W.sim, c = sim.casting, p = sim.player, d = W.delve, f = W.fight, T = sim.time;
  const near = (x, z, r) => Math.hypot(x - p.x, z - p.z) < r;
  (d.leaps || []).forEach((l, n) => {
    for (const [a, b, back] of [[l.from, l.to, false], [l.to, l.from, true]]) {
      if (back && l.one) continue;
      const x = d.x + a[0], z = d.z + a[1];
      if (!near(x, z, 110)) continue;
      const y = caveFloorY(x, z);
      if (f?.spec?.gust && !f.spec.gust(W, f, l, back)) { c.fx(FX.RUNE, ELEM.FIRE, x, y + 0.05, z, 1.25, 0, 1, 0, 0, 0.32, 0, 0, 0.9, n); continue; }
      c.fx(FX.COLUMN, ELEM.STORM, x, y - 0.2, z, 7, 0, 1, 0, 0.85, 0.45, 0, 0, 0, n + (back ? 0.5 : 0));
      const tx = d.x + b[0], tz = d.z + b[1], L = Math.hypot(tx - x, tz - z) || 1, ux = (tx - x) / L, uz = (tz - z) / L;
      // (Its point walking out from the stone's rim along the way it throws, over and over.)
      const k = (T * 0.8 + n * 0.37) % 1, at = 1.5 + k * 1.2, px = x + ux * at, pz = z + uz * at, al = 0.85 * Math.sin(k * Math.PI);
      for (const s of [-1, 1]) {
        const ca = Math.cos(2.45 * s), sa = Math.sin(2.45 * s), dx = ux * ca - uz * sa, dz = ux * sa + uz * ca;
        c.fx(FX.MARK, ELEM.STORM, px, caveFloorY(px, pz) + 0.06, pz, 1, dx, 0.14, dz, 0.8, al, 0, 0, 1.5, n, 3);
      }
    }
  });
  for (const q of d.props) {
    if (q.kind !== 'scalestone' || !q.god) continue;
    const x = d.x + q.x, z = d.z + q.z, [god, e] = SCALE_GOD[q.god];
    if (W.down.has(god) || !near(x, z, 150)) continue;
    const y = caveFloorY(x, z), fl = 0.85 + 0.15 * Math.sin(T * 1.9 + q.x);
    c.fx(FX.ORB, e, x, y + q.h * 1.22, z, 0.6, 0, 1, 0, 0, 0.95 * fl, 0, 0, 0, q.x);
    c.fx(FX.COLUMN, e, x, y - 0.1, z, q.h * 1.15, 0, 1, 0, 0.7, 0.3 * fl, 0, 0, 0, q.z);
    c.fx(FX.RUNE, e, x, y + 0.05, z, 2, 0, 1, 0, 0, 0.6, 0, 0, 0.9, q.x + q.z);
  }
  const lip = roomOf('ed_maw');
  if (lip && near(d.x + lip.x, d.z + lip.z, 130)) {
    const cx = d.x + lip.x, cz = d.z + lip.z, nf = f?.boss.key === 'nihvaroth' ? f : null;
    if (!nf?.devour && !nf?.swallow) {
      const As = nf?.starA || Array.from({ length: STARS.n }, (_, i) => i / STARS.n * TAU), spin = nf ? nf.spin || 0 : T * STARS.spin, R = nf?.ring ? Math.min(STARS.r, nf.ring.r0 - 5) : STARS.r;
      for (const [i, sa] of As.entries()) { const a = spin + sa, x = cx + Math.sin(a) * R, z = cz + Math.cos(a) * R; c.fx(FX.RUNE, ELEM.LIGHT, x, caveFloorY(x, z) + 0.05, z, 3.2, 0, 1, 0, 0, 0.3, 0, 0, 0.9, i); }
    }
  }
}
