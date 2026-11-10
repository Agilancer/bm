// The Hollowfang Warrens on the sim thread (src/core/dungeon.js says where everything is): the portals in and out, the packs'
// rooms, the three boss fights and what each does, a wipe, and the way it all comes back after one.
//
// The fights are scripted the way an MMO's dungeon is: each boss has things it does on a clock or at so much of its life,
// called out as it does them (EV.DELVE WARN: the words are WARNINGS in src/core/dungeon.js), and something the party has to
// do about each. What lands on the ground is a hazard here: a circle that's drawn first, then goes off (rocks), or a patch
// that burns while you stand in it (fire, acid). The hired party (src/sim/hero.js companion) reads the same hazards and
// the same calls: out of the circles, at the dragon's sides, behind a pillar.
import { ADDS, BOSSES, DELVE, ENTRY, EXIT_IN, EXIT_OUT, HOLES, PARTY, PERCH, PILLARS, PORTAL, TURN_WARN, caveClear, caveFloorY, caveRoom, inDungeon, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { EV, INPUT } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { terrainHeight } from '../core/terrain.js';
import { ELEM, FX } from './spells.js';
import { TripoMonster } from './tripo.js';
import { foeOf } from './foes.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const BOSS_ROOM_PAD = 8;       // a boss notices you this far inside its room's edge
const RESET_AFTER = 900;       // seconds out of the Warrens before its dead stand again

export class Warrens {
  constructor(sim) {
    this.sim = sim;
    this.inside = false;
    this.down = new Set();         // bosses dead
    this.hazards = [];
    this.fight = null;             // the boss fight on, if there is one
    this.portalCd = 0;
    this.leftAt = -1e9;
    this.postT = 0;
    this.warnT = new Map();
  }

  // ---- who's in it ---------------------------------------------------------------------------------------------------

  party() { return this.sim.heroes.filter((h) => h.hired); }
  // Everyone the dungeon hurts: you and your party.
  bodies() { const p = this.sim.player; return [p, ...this.party()].filter((b) => !b.dead && (b === p || b.active)); }
  has(role) { return this.party().filter((h) => h.role === role).length; }

  // Whether a party is fit to go in, and what's missing.
  ready() {
    const ps = this.party(), tanks = this.has('tank'), heals = this.has('heal');
    return { ok: ps.length >= PARTY.size && tanks >= 1 && heals >= 1, n: ps.length, tanks, heals };
  }

  warn(id, gap = 0) {
    const t = this.sim.time;
    if (gap && t - (this.warnT.get(id) ?? -1e9) < gap) return;
    this.warnT.set(id, t);
    this.sim.event(EV.DELVE, DELVE.WARN, id);
  }

  // ---- moving people about -------------------------------------------------------------------------------------------

  // Stood somewhere, still, facing yaw: the player (with the view turned to match) or a hero.
  put(b, x, z, yaw) {
    const sim = this.sim, y = sim.world.height(x, z);
    b.x = x; b.z = z; b.y = y; b.vx = 0; b.vz = 0;
    if (b === sim.player) {
      b.vy = 0; b.onGround = true; b.yaw = yaw; b.surfing = false;
      sim.input[INPUT.YAW] = yaw;
      self.postMessage({ type: 'look', yaw, pitch: 0 });
    } else {
      b.lastX = x; b.lastZ = z; b.yaw = b.faceYaw = yaw; b.goal = null; b.foe = null; b.surf = null; b.jump = null; b.swing = null;
      b.trail = null; b.stuckT = 0;
    }
  }

  // The player to (x, z), and the party round behind them.
  carry(x, z, yaw) {
    const sim = this.sim, p = sim.player;
    this.put(p, x, z, yaw);
    this.party().forEach((h, i) => {
      if (h.dead) sim.heroWorld.revive(h, 0.6);
      for (let t = 0; t < 8; t++) {
        const a = yaw + Math.PI + (i - 1.5) * 0.55 + t * 0.4, r = 2.4 + (t % 3) * 0.8;
        const hx = x + Math.sin(a) * r, hz = z + Math.cos(a) * r;
        if (!sim.world.inside(hx, hz, 0.5)) { this.put(h, hx, hz, yaw); break; }
      }
      sim.heroWorld.puff(h.x, h.y + 1, h.z, ELEM.FROST);
    });
    sim.event(EV.BLINK, p.x, p.y + 1, p.z);
  }

  // ---- each tick -----------------------------------------------------------------------------------------------------

  step(dt) {
    const sim = this.sim, p = sim.player;
    this.portalCd -= dt;
    const was = this.inside;
    this.inside = inDungeon(p.x, p.z);
    if (was && !this.inside) this.leftAt = sim.time;
    // A long while away and its dead are back, and its bosses with them.
    if (!this.inside && sim.time - this.leftAt > RESET_AFTER && (this.down.size || this.anyCleared())) this.resetAll();
    if (!p.dead && sim.gameState === 0) this.portals();
    // (A pack once cleared is kept so, through a death: afterRestart.)
    const t = sim.tripo;
    if (t && (sim.tick & 31) === 0) for (const l of t.lairs) if (l.dungeon && !l.add && l.state === 'cleared') l.clearedOnce = true;
    if (!this.inside) { if (this.hazards.length) this.hazards.length = 0; this.fight = null; return; }
    this.stepHazards(dt);
    this.stepPacks(dt);
    this.stepBosses(dt);
    this.post(dt);
  }

  anyCleared() { return this.sim.tripo?.lairs.some((l) => l.dungeon && l.state === 'cleared'); }

  // In by the portal at the cave mouth (a full party only), out by the two inside.
  portals() {
    const sim = this.sim, p = sim.player;
    if (this.portalCd > 0) return;
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r && Math.abs(p.y - sim.world.height(x, z)) < 3;
    if (!this.inside && near(PORTAL.x, PORTAL.z, PORTAL.r)) {
      const r = this.ready();
      this.portalCd = 3;
      if (!r.ok) { sim.event(EV.DELVE, DELVE.NEED, r.n, r.tanks, r.heals); return; }
      const [x, z] = toWorld(ENTRY.x, ENTRY.z);
      this.carry(x, z, ENTRY.yaw);
      this.inside = true;
      sim.event(EV.DELVE, DELVE.ENTER, this.down.size);
      return;
    }
    if (!this.inside) return;
    const [ix, iz] = toWorld(EXIT_IN.x, EXIT_IN.z), [ox, oz] = toWorld(EXIT_OUT.x, EXIT_OUT.z);
    const out = near(ix, iz, 1.6) || (this.down.has('venomaw') && near(ox, oz, 1.8));
    if (out && !this.fight) {
      this.portalCd = 3;
      const cleared = this.down.has('venomaw');
      // Out in front of the portal at the cave mouth, facing away from it.
      this.carry(PORTAL.x + Math.sin(PORTAL.yaw) * 4, PORTAL.z + Math.cos(PORTAL.yaw) * 4, PORTAL.yaw);
      this.inside = false; this.leftAt = sim.time;
      sim.event(EV.DELVE, cleared ? DELVE.CLEAR : DELVE.LEAVE, this.down.size);
      if (cleared) this.resetAll();
    }
  }

  // Everything back as it was: every pack and boss stands again.
  resetAll() {
    const t = this.sim.tripo;
    this.down.clear(); this.fight = null; this.hazards.length = 0;
    if (t) for (const l of t.lairs) if (l.dungeon) { if (l.state === 'awake') t.sleep(l); l.state = 'asleep'; l.clearedOnce = false; l.spawned = 0; l.killed = 0; }
    this.sim.event(EV.DELVE, DELVE.RESET);
  }

  // After the world is started over (a death, a load): the packs you'd killed stay dead and the bosses down stay down. If
  // you fell in here, you're stood at the way in with your party, the boss you fell to back at its full life.
  afterRestart(wasInside) {
    const sim = this.sim, t = sim.tripo;
    this.fight = null; this.hazards.length = 0;
    if (t) for (const l of t.lairs) if (l.dungeon && (l.clearedOnce || this.down.has(l.key))) l.state = 'cleared';
    if (wasInside) {
      const [x, z] = toWorld(ENTRY.x, ENTRY.z);
      this.carry(x, z, ENTRY.yaw);
      this.inside = true;
      sim.event(EV.DELVE, DELVE.WIPE, this.down.size);
    } else {
      // (Fallen out in the world, the party comes to you.)
      const p = sim.player;
      this.party().forEach((h) => { if (h.dead || Math.hypot(h.x - p.x, h.z - p.z) > 30) sim.heroWorld.revive(h, 1, p.x - 3, p.z - 2); });
    }
  }

  // ---- what lands on the ground ---------------------------------------------------------------------------------------
  // kind: 'drop' goes off once when its fuse runs out (dmg); 'pool' burns what's in it each half second (dps) for life.

  addHazard(h) {
    const y = caveFloorY(h.x, h.z);
    this.hazards.push({ t: 0, fuse: 0, life: 0, dmg: 0, dps: 0, knock: 0, elem: ELEM.FIRE, tick: 0, y, ...h });
  }

  stepHazards(dt) {
    const sim = this.sim;
    for (const h of this.hazards) {
      h.t += dt;
      if (h.kind === 'drop') {
        if (h.t >= h.fuse && !h.done) {
          h.done = true;
          for (const b of this.bodies()) if (Math.hypot(b.x - h.x, b.z - h.z) < h.r + 0.3) this.hurt(b, h.dmg, h.x, h.z, h.knock);
          sim.casting.burst(FX.SHOCK, h.elem, h.x, h.y + 0.3, h.z, 0.4, h.r * 1.1, 0.5, { light: 6, lightR: 6 });
          for (let i = 0; i < 4; i++) sim.casting.burst(FX.ROCK, ELEM.STONE, h.x + rnd(-h.r, h.r) * 0.6, h.y + 0.25, h.z + rnd(-h.r, h.r) * 0.6, 0.35, 0.3, 1.2);
          sim.event(EV.GROUND, h.x, h.y, h.z);
        }
      } else if (h.t >= h.fuse) {
        h.tick -= dt;
        if (h.tick <= 0) {
          h.tick = 0.5;
          for (const b of this.bodies()) if (Math.hypot(b.x - h.x, b.z - h.z) < h.r) this.hurt(b, h.dps * 0.5, h.x, h.z, 0);
        }
      }
    }
    this.hazards = this.hazards.filter((h) => (h.kind === 'drop' ? h.t < h.fuse + 0.4 : h.t < h.fuse + h.life));
  }

  // A hurt that a shield can't stop: it comes from above, or from the ground.
  hurt(b, dmg, x, z, knock) {
    const sim = this.sim;
    if (b === sim.player) return b.damage(sim, dmg, x, z, knock, true);
    return b.damage(sim, dmg, x, z, knock, true);
  }

  // Drawn after the spells' own shapes each tick: the circles before they go off, the patches while they burn.
  drawFx() {
    if (!this.inside) return;
    const c = this.sim.casting;
    for (const h of this.hazards) {
      if (h.kind === 'drop') {
        const k = clamp(h.t / h.fuse, 0, 1);
        c.fx(FX.DISC, h.elem, h.x, h.y + 0.06, h.z, h.r, 0, 1, 0, 0, 0.18 + 0.4 * k, 0, 0, 0, h.seed || 0);
        c.fx(FX.RING, h.elem, h.x, h.y + 0.08, h.z, h.r, 0, 1, 0, 0, 0.6 + 0.4 * k, 2 * k, 3, 0, 0);
        c.fx(FX.RING, h.elem, h.x, h.y + 0.08, h.z, h.r * k, 0, 1, 0, 0, 0.8, 0, 0, 0, 0);
      } else if (h.t >= h.fuse) {
        const fade = clamp((h.fuse + h.life - h.t) / 1.5, 0, 1);
        c.fx(FX.DISC, h.elem, h.x, h.y + 0.05, h.z, h.r, 0, 1, 0, 0, 0.5 * fade, 4 * fade, h.r * 1.5, 0, h.seed || 0);
        if (((this.sim.tick + (h.seed * 100 | 0)) & 7) === 0) c.burst(h.elem === ELEM.FIRE ? FX.FLAME : FX.PUFF, h.elem, h.x + rnd(-h.r, h.r) * 0.6, h.y + 0.2, h.z + rnd(-h.r, h.r) * 0.6, 0.3, 0.9, 0.9, { alpha: 0.7 * fade });
      } else {
        c.fx(FX.RING, h.elem, h.x, h.y + 0.08, h.z, h.r, 0, 1, 0, 0, 0.8, 0, 0, 0, 0);
      }
    }
  }

  // Where a body at (x, z) should step to, out of every circle and patch it's in (or null if it's clear). For the party.
  danger(x, z, pad = 0.8) {
    let push = null;
    for (const h of this.hazards) {
      const d = Math.hypot(x - h.x, z - h.z);
      if (d > h.r + pad) continue;
      const L = d || 1, out = h.r + pad + 0.6 - d;
      const ux = d > 0.05 ? (x - h.x) / L : Math.cos(h.seed * 6.28 || 1), uz = d > 0.05 ? (z - h.z) / L : Math.sin(h.seed * 6.28 || 1);
      push = push || [0, 0];
      push[0] += ux * out; push[1] += uz * out;
    }
    if (!push) return null;
    // (Out into the open, not into the rock.)
    let tx = x + push[0], tz = z + push[1];
    if (caveRoom(tx, tz) < 0.8) { tx = x - push[1]; tz = z + push[0]; }
    if (caveRoom(tx, tz) < 0.8) { tx = x + push[1]; tz = z - push[0]; }
    return [tx, tz];
  }
  safe(x, z) { return !this.danger(x, z, 0.4); }

  // ---- the bosses ----------------------------------------------------------------------------------------------------

  bossBodies(key) {
    const t = this.sim.tripo;
    if (!t) return [];
    return t.slots().filter((k) => k instanceof TripoMonster && k.lair?.key === key);
  }

  stepBosses(dt) {
    const sim = this.sim, p = sim.player, t = sim.tripo;
    if (!t) return;
    for (const b of BOSSES) {
      if (this.down.has(b.key)) continue;
      const lair = t.lairs.find((l) => l.key === b.key);
      if (!lair) continue;
      const [rx, , rz] = roomSpot(b.room), R = roomOf(b.room).r;
      const dRoom = Math.hypot(p.x - rx, p.z - rz);
      // Stood up as you come down the way to its room.
      if (lair.state === 'asleep' && dRoom < R + 30) t.wake(lair);
      const bodies = this.bossBodies(b.key);
      for (const m of bodies) if (!m.setUp) this.setUp(m, b);
      if (lair.state === 'cleared' || (bodies.length && bodies.every((m) => m.dead) && lair.spawned >= b.models.length)) {
        this.down.add(b.key); lair.state = 'cleared'; lair.clearedOnce = true;
        if (this.fight?.boss === b) { this.fight = null; this.hazards.length = 0; }
        sim.event(EV.DELVE, DELVE.BOSS_DOWN, BOSSES.indexOf(b));
        // A boss's hoard: a few more things on the floor where it fell.
        const m = bodies[0];
        if (m) for (let i = 0; i < (b.key === 'venomaw' ? 4 : 1); i++) sim.event(EV.LOOT, m.x + rnd(-2, 2), sim.world.height(m.x, m.z), m.z + rnd(-2, 2), b.key === 'venomaw' ? 8 : 6, 0);
        continue;
      }
      const live = bodies.filter((m) => !m.dead);
      if (!live.length) continue;
      // The fight begins when one of them notices anyone, and ends when they're dead, or nobody's left in the room.
      if (!this.fight && live.some((m) => m.aggro)) this.begin(b, live);
      if (this.fight?.boss === b) {
        const party = this.bodies().filter((x) => Math.hypot(x.x - rx, x.z - rz) < R + 14);
        if (!party.length || p.dead) { this.endFight(b, live); continue; }
        this.fight.t += dt;
        for (const m of live) { m.aggro = true; if (Math.hypot(m.x - rx, m.z - rz) > R + 6 && !m.flying) { m.vx = (rx - m.x) * 0.3; } }
        this[b.key](dt, this.fight, live);
        this.turnOn(this.fight, live);
      } else if (!this.fight && dRoom < R - BOSS_ROOM_PAD && live.some((m) => !m.aggro)) for (const m of live) m.notice(sim);
    }
  }

  // Now and then the boss turns from the tank and comes for you: called out first, a moment to get behind the tank or out
  // of its reach, then a few seconds when nothing holds it (foeOf). Not while it flies, spins or breathes, and not if
  // you're on your own (then it's on you anyway).
  turnOn(f, live) {
    const sim = this.sim, p = sim.player, now = sim.time, t = f.turn;
    if (t) {
      if (!t.on && now >= t.at && !t.m.dead) { t.on = true; t.m.fixOn = p; t.m.fixT = t.until; sim.event(EV.ROAR, t.m.x, t.m.y + 2, t.m.z, 1.1); }
      if (now >= t.until || t.m.dead || p.dead) { t.m.fixOn = null; f.turn = null; }
      return;
    }
    if (p.dead || !this.party().some((h) => !h.dead)) return;
    const able = live.filter((m) => !m.flying && !m.spin && !m.breathing && !m.script);
    if (!able.length || !this.every(f, 'turn', f.boss.key === 'venomaw' ? 22 : 17)) return;
    const m = pick(able), wait = 1.3;
    f.turn = { m, at: now + wait, until: now + wait + (f.boss.key === 'venomaw' ? 4 : 5), on: false };
    this.warn(TURN_WARN[f.boss.key]);
  }

  // The packs' kobolds and goblins mostly keep to the tank once he has them, but now and then one breaks off and comes
  // for you for a few seconds (two at most at once, and only one that's near): hold your ground, or get back to him. The
  // tank goes after whatever's loose (src/sim/hero.js pickFoe), and takes it back when it lets go.
  stepPacks(dt) {
    const sim = this.sim, p = sim.player, t = sim.tripo, now = sim.time;
    if (!t || p.dead || !this.party().some((h) => !h.dead)) return;
    const list = t.slots().filter((k) => k instanceof TripoMonster && k.lair?.dungeon && !k.boss && !k.dead && k.aggro && !k.script);
    let on = list.filter((k) => k.fixOn === p && now < k.fixT).length;
    for (const k of list) {
      k.turnCd = (k.turnCd ?? rnd(5, 12)) - dt;
      if (k.turnCd > 0) continue;
      k.turnCd = rnd(9, 16);
      if (on >= 2 || Math.hypot(k.x - p.x, k.z - p.z) > 24 || foeOf(k, sim) === p || Math.random() > 0.45) continue;
      k.fixOn = p; k.fixT = now + rnd(3.5, 5.5); on++;
      sim.event(EV.ROAR, k.x, k.y + 1.2, k.z, 0.6);
    }
  }

  setUp(m, b) {
    m.setUp = true;
    m.boss = true; m.bossKey = b.key;
    const n = b.models.indexOf(m.opts.model);
    m.hp = m.maxHp = b.hp;
    Object.assign(m.opts, { damage: b.damage, reach: b.reach, sight: 30, leash: 200, lootKind: b.loot, name: (b.names || [])[n] || b.name, pause: 0.9 });
    m.opts.hp = b.hp;
    if (b.key === 'venomaw') { m.breathCd = 1e9; m.opts.breathRange = 14; m.opts.breathDps = 26; m.opts.radius = 2.2; }
    m.yaw = Math.atan2(this.sim.player.x - m.x, this.sim.player.z - m.z);
  }

  begin(b, live) {
    const sim = this.sim;
    this.fight = { boss: b, t: 0, clock: {}, phase: 0, stacks: 0 };
    this.hazards.length = 0;
    for (const m of live) { m.notice(sim); m.hp = m.maxHp; }
    const [c0, c1] = live.map((m) => m.id);
    sim.event(EV.DELVE, DELVE.BOSS, BOSSES.indexOf(b), c0 ?? -1, c1 ?? -1);
    if (b.key === 'twins') this.warn(3);
    if (b.key === 'venomaw') this.warn(7);
  }

  // Nobody left in the room, or you fell: it goes back to where it stood, its life back, and waits.
  endFight(b, live) {
    const sim = this.sim, [rx, , rz] = roomSpot(b.room);
    for (const m of live) {
      m.aggro = false; m.hp = m.maxHp; m.flying = false; m.liftExtra = 0; m.script = null; m.home = [rx, rz];
      m.x = rx + rnd(-2, 2); m.z = rz + rnd(-2, 2); m.y = sim.world.height(m.x, m.z); m.heroFoe = null; m.tauntBy = null; m.fixOn = null;
    }
    // (Its adds go with it.)
    for (const a of this.adds()) a.hp = 0;
    this.fight = null; this.hazards.length = 0;
  }

  // The fight's own monsters that aren't the boss: diggers and whelps.
  adds() { const t = this.sim.tripo; return t ? t.slots().filter((k) => k instanceof TripoMonster && k.lair?.add && !k.dead) : []; }

  // A few at once, at a place, as a lair of their own; each given its part when it stands (o.setUp).
  spawnAdds(key, id, at, n, setUp, pal = ['Base']) {
    const t = this.sim.tripo;
    if (!t) return;
    const lair = { key, x: at[0], z: at[1], r: 1.2, pick: [id], n, pal, wake: -1, dungeon: true, add: true, temp: true, state: 'asleep', at: -1e9, onSpawn: setUp };
    t.lairs.push(lair);
    t.wake(lair);
  }

  every(f, name, secs) {
    const c = f.clock;
    if (c[name] === undefined) c[name] = secs * rnd(0.5, 0.8);
    c[name] -= 1 / 120;
    if (c[name] > 0) return false;
    c[name] = secs * rnd(0.9, 1.15);
    return true;
  }

  // ---- Grubnash: the cave-in, his diggers -----------------------------------------------------------------------------

  grubnash(dt, f, [m]) {
    const sim = this.sim, frac = m.hp / m.maxHp;
    if (this.every(f, 'cavein', 13)) {
      this.warn(0);
      for (const b of this.bodies()) this.addHazard({ kind: 'drop', x: b.x + rnd(-1, 1), z: b.z + rnd(-1, 1), r: 2.6, fuse: 2.4, dmg: 46, knock: 2, elem: ELEM.STONE, seed: Math.random() });
      sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.2);
    }
    // At seven tenths and a third of his life, the diggers come out of their holes and run to him.
    for (const [at, k] of [[0.7, 'd1'], [0.35, 'd2']]) {
      if (frac < at && !f[k]) {
        f[k] = true;
        this.warn(1);
        HOLES.forEach((h, i) => this.spawnAdds(`hf_dig_${k}_${i}`, ADDS.digger, toWorld(h[0], h[1]), 1, (d) => this.digger(d, m), ['Infernal']));
      }
    }
    // Every digger that reaches him is eaten, and he hits harder for it.
    for (const d of this.adds()) {
      if (Math.hypot(d.x - m.x, d.z - m.z) < 2.6 + m.opts.radius) {
        d.hp = 0; d.die(sim);
        f.stacks++; m.opts.damage *= 1.22; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.04);
        this.warn(2);
        sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1);
      }
    }
    if (f.t > 240 && !f.enraged) { f.enraged = true; m.opts.damage *= 2; this.warn(15); }
  }

  // A digger runs for its master and nothing else; it only fights back if it's cornered.
  digger(d, boss) {
    d.hp = d.maxHp = 110; d.opts.speed = 1.7; d.opts.name = 'DIGGER';
    d.aggro = true;
    d.script = (k, dt, sim) => {
      if (boss.dead) { k.script = null; return false; }
      const flow = k.flow;
      sim.world.updateField(boss.x, boss.z, sim.time, k.id + 1);
      sim.world.flow(flow, k.x, k.z, boss.x, boss.z, k.id + 1);
      const sp = k.flinch > 0 ? 0.5 : k.opts.speed;
      k.vx = flow[0] * sp; k.vz = flow[1] * sp;
      k.yaw += clamp(wrapAngle(Math.atan2(flow[0], flow[1]) - k.yaw), -dt * 5, dt * 5);
      k.setClip(k.rig.clips.run ? 'run' : 'walk');
      k.t += dt * clamp(sp / (k.rig.clips[k.clip].speed || 1), 0.4, 1.8);
      return true;
    };
  }

  // ---- Skrit and Skrat: the shared pain, the firepot, the whirlwind ----------------------------------------------------

  twins(dt, f, live) {
    const sim = this.sim;
    const skrit = live.find((m) => m.opts.model === 'hf_skrit'), skrat = live.find((m) => m.opts.model === 'hf_skrat');
    // Shared pain: the one with less life left takes half of what lands on it while they're far apart.
    if (skrit && skrat) {
      const a = skrit.hp / skrit.maxHp, b = skrat.hp / skrat.maxHp;
      skrit.ward = a < b - 0.15 ? 0.5 : 1; skrat.ward = b < a - 0.15 ? 0.5 : 1;
      if (Math.abs(a - b) > 0.15) this.warn(3, 14);
    } else {
      const last = skrit || skrat;
      if (last && !f.wild) { f.wild = true; last.ward = 1; last.opts.damage *= 1.6; last.opts.pause = 0.5; this.warn(6); sim.event(EV.ROAR, last.x, last.y + 2, last.z, 1.3); }
    }
    if (skrit && this.every(f, 'firepot', 9)) {
      const all = this.bodies(), pool = all.filter((b) => b.role !== 'tank'), who = pick(pool.length ? pool : all);
      if (who) {
        this.warn(4);
        this.addHazard({ kind: 'pool', x: who.x, z: who.z, r: 3.1, fuse: 1.8, life: 10, dps: 22, elem: ELEM.FIRE, seed: Math.random() });
        sim.casting.burst(FX.FLARE, ELEM.FIRE, skrit.x, skrit.y + 1.6, skrit.z, 0.4, 0.1, 0.3, { light: 6, lightR: 4 });
      }
    }
    if (skrat && !skrat.spin && this.every(f, 'whirl', 16)) {
      this.warn(5);
      skrat.spin = 3.4;
      const clip = pick(skrat.rig.attacks);
      skrat.script = (k, dt2, s2, foe) => {
        k.spin -= dt2;
        if (k.spin <= 0 || k.dead) { k.spin = 0; k.script = null; k.state = 0; k.setClip(k.idleClip); return false; }
        k.yaw += dt2 * 9;
        const L = Math.hypot(foe.x - k.x, foe.z - k.z) || 1;
        k.vx = (foe.x - k.x) / L * 1.4; k.vz = (foe.z - k.z) / L * 1.4;
        if (k.clip !== clip) k.setClip(clip);
        k.t = (k.t + dt2 * 1.4) % k.rig.clips[clip].dur;
        k.spinTick = (k.spinTick || 0) - dt2;
        if (k.spinTick <= 0) {
          k.spinTick = 0.5;
          for (const b of this.bodies()) if (Math.hypot(b.x - k.x, b.z - k.z) < 5) this.hurt(b, 15, k.x, k.z, 1.5);
          s2.event(EV.WHOOSH, k.x, k.y + 1.2, k.z);
        }
        if (s2.heroWorld && ((s2.tick & 3) === 0)) s2.casting.burst(FX.RING, ELEM.SPIRIT, k.x, k.y + 1, k.z, 1.5, 5, 0.3, { alpha: 0.5 });
        return true;
      };
    }
  }

  // ---- Venomaw: the breath in front, the tail behind, acid, the flight over the hoard, the whelps, the frenzy -------------

  venomaw(dt, f, [m]) {
    const sim = this.sim, frac = m.hp / m.maxHp, [px, pz] = toWorld(PERCH.x, PERCH.z);
    if (f.phase === 0 && frac < 0.55) {
      f.phase = 1; f.flyT = 26; f.breaths = 0;
      this.warn(10);
      m.flying = true; f.clock.fly = 5.5;
      this.spawnAdds('hf_whelps_1', ADDS.whelp, [m.x, m.z], 3, (w) => this.whelp(w), ['Blighted']);
      this.warn(12);
      m.script = (k, dt2, s2) => this.fly(k, dt2, s2, f, px, pz);
    }
    if (f.phase === 1) {
      f.flyT -= dt;
      if (f.flyT <= 0) { f.phase = 2; m.flying = false; m.liftExtra = 0; m.script = null; this.warn(13); m.opts.damage *= 1.25; this.spawnAdds('hf_whelps_2', ADDS.whelp, [m.x, m.z], 2, (w) => this.whelp(w), ['Blighted']); }
      return;
    }
    // On the ground: the breath at the tank, the tail at whoever's behind, acid at someone.
    // (Not while she's turned on you: her head's away from the tank, and a breath then would be the end of you.)
    if (!m.breathing && m.state === 0 && !f.turn?.on && this.every(f, 'breath', f.phase === 2 ? 10 : 13)) {
      this.warn(8);
      // (Her own breath, at whoever she's on: src/sim/tripo.js BREATH. The cone below is for everyone else in front of her.)
      m.breathing = true; m.state = 4; m.setClip(m.rig.clips.breath2 && Math.random() < 0.4 ? 'breath2' : 'breath');
    }
    if (m.breathing) {
      if (m.state === 4) {
        // (Everything in the cone in front of her takes it, not only the one she's looking at.)
        const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
        for (const b of this.bodies()) {
          if (b === m.heroFoe && b.role === 'tank') continue;
          const dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz) || 1;
          if (d < 15 && (dx * fx + dz * fz) / d > 0.72) { b.venomBurn = (b.venomBurn || 0) + 30 * dt; if (b.venomBurn > 8) { this.hurt(b, b.venomBurn, m.x, m.z, 0.5); b.venomBurn = 0; } }
        }
      }
      else { m.breathing = false; m.breathCd = 1e9; }
    }
    if (this.every(f, 'tail', 7)) {
      const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
      const behind = this.bodies().filter((b) => { const dx = b.x - m.x, dz = b.z - m.z, d = Math.hypot(dx, dz) || 1; return d < 9 && (dx * fx + dz * fz) / d < -0.5; });
      if (behind.length) {
        for (const b of behind) this.hurt(b, 34, m.x, m.z, 6);
        sim.event(EV.WHOOSH, m.x, m.y + 1, m.z); sim.event(EV.GROUND, m.x, m.y, m.z);
        sim.casting.burst(FX.SHOCK, ELEM.POISON, m.x - fx * 5, m.y + 0.4, m.z - fz * 5, 0.5, 5, 0.4);
      }
    }
    if (this.every(f, 'acid', f.phase === 2 ? 7 : 10)) {
      const pool = this.bodies().filter((b) => b.role !== 'tank');
      const who = pick(pool.length ? pool : this.bodies());
      if (who) { this.warn(9); this.addHazard({ kind: 'pool', x: who.x, z: who.z, r: 3, fuse: 1.6, life: 14, dps: 18, elem: ELEM.POISON, seed: Math.random() }); }
    }
    if (f.t > 420 && !f.enraged) { f.enraged = true; m.opts.damage *= 3; this.warn(16); }
  }

  // Up and over the hoard to her perch, breathing across the whole cavern every few seconds; only rock between her and
  // you keeps it off.
  fly(k, dt, sim, f, px, pz) {
    const dx = px - k.x, dz = pz - k.z, d = Math.hypot(dx, dz);
    k.liftExtra = Math.min(PERCH.up, (k.liftExtra || 0) + dt * 3);
    const clip = k.rig.clips.fly ? 'fly' : 'idle';
    if (k.clip !== clip) k.setClip(clip);
    k.t = (k.t + dt) % k.rig.clips[clip].dur;
    const [cx, , cz] = roomSpot('lair');
    if (d > 1.5) { k.vx = dx / d * 7; k.vz = dz / d * 7; k.yaw += clamp(wrapAngle(Math.atan2(dx, dz) - k.yaw), -dt * 2, dt * 2); }
    else { k.vx = k.vz = 0; k.yaw += clamp(wrapAngle(Math.atan2(cx - k.x, cz - k.z) - k.yaw), -dt * 2, dt * 2); }
    f.clock.fly -= dt;
    if (f.clock.fly <= 0 && !f.flame) { f.flame = 2.2; this.warn(11); sim.event(EV.ROAR, k.x, k.y + 5, k.z, 1.6); }
    if (f.flame) {
      f.flame -= dt;
      if (f.flame <= 0) {
        f.flame = 0; f.clock.fly = 6.5;
        const mouth = [k.x, k.y + k.meta.height * 0.6 + k.hover, k.z];
        for (const b of this.bodies()) {
          if (!caveClear(mouth[0], mouth[2], b.x, b.z, 0.05)) continue;
          this.hurt(b, 70, k.x, k.z, 1);
          sim.event(EV.BURN, b.x, b.y + 1, b.z);
        }
        for (let i = 0; i < 10; i++) {
          const a = Math.atan2(cx - k.x, cz - k.z) + (i - 4.5) * 0.12;
          sim.casting.burst(FX.FLAME, ELEM.POISON, k.x + Math.sin(a) * 8, mouth[1] - 3, k.z + Math.cos(a) * 8, 1.2, 4, 1.1, { alpha: 0.8, light: 6, lightR: 10 });
          sim.casting.burst(FX.PUFF, ELEM.POISON, k.x + Math.sin(a) * 18, caveFloorY(k.x, k.z) + 1, k.z + Math.cos(a) * 18, 1.5, 5, 1.6, { alpha: 0.6 });
        }
      }
    }
    return true;
  }

  // Where to hide from the breath across the hoard: the side of the nearest pillar away from her (for the party). Null if
  // she isn't flying.
  hideFrom(x, z) {
    const f = this.fight;
    if (!f || f.boss.key !== 'venomaw' || f.phase !== 1) return null;
    const m = this.bossBodies('venomaw').find((k) => !k.dead);
    if (!m) return null;
    // (From her perch, where she breathes from: a pillar right beside it hides nothing.)
    const [sx, sz] = toWorld(PERCH.x, PERCH.z);
    let best = null, bd = Infinity;
    for (const [lx, lz, r] of PILLARS) {
      const [qx, qz] = toWorld(lx, lz);
      const ax = qx - sx, az = qz - sz, L = Math.hypot(ax, az) || 1;
      if (L < 12 || L > 60) continue;
      const hx = qx + ax / L * (r + 1.3), hz = qz + az / L * (r + 1.3);
      if (caveRoom(hx, hz) < 0.6) continue;
      const d = Math.hypot(hx - x, hz - z);
      if (d < bd) { bd = d; best = [hx, hz]; }
    }
    return best;
  }

  whelp(w) { w.hp = w.maxHp = 160; w.opts.damage = 9; w.opts.name = 'WHELP'; w.aggro = true; w.opts.leash = 200; }

  // For tests and reviews (bm.warrens in src/main.js): in at the way in, or straight to a boss's door; a boss nearly dead.
  debug(m) {
    const sim = this.sim;
    if (m.cmd === 'enter' || m.cmd === 'boss') {
      let [x, z] = toWorld(ENTRY.x, ENTRY.z), yaw = ENTRY.yaw;
      if (m.cmd === 'boss') {
        const b = BOSSES[m.n | 0], r = roomOf(b.room), [rx, rz] = toWorld(r.x, r.z);
        // (At the room's edge, on the side of the way in: a few strides down the last tunnel.)
        const nav = sim.world.cave || null;
        let best = null, bd = Infinity;
        for (let a = 0; a < 6.28; a += 0.2) {
          const qx = rx + Math.sin(a) * (r.r + 4), qz = rz + Math.cos(a) * (r.r + 4);
          if (caveRoom(qx, qz) < 1.2) continue;
          const d = Math.hypot(qx - x, qz - z);
          if (d < bd) { bd = d; best = [qx, qz]; }
        }
        void nav;
        if (best) { [x, z] = best; yaw = Math.atan2(rx - x, rz - z); }
        for (const p of BOSSES.slice(0, m.n | 0)) this.down.add(p.key);
      }
      this.carry(x, z, yaw);
      this.inside = true;
    }
    if (m.cmd === 'hurt') for (const k of this.bossBodies(BOSSES[m.n | 0].key)) if (!k.dead) k.hp = k.maxHp * (m.frac ?? 0.05);
    if (m.cmd === 'reset') this.resetAll();
  }

  // The fight as the page needs it, a few times a second (auto-play reads it, and the boss's frame).
  post(dt) {
    if ((this.postT -= dt) > 0) return;
    this.postT = 0.2;
    const f = this.fight;
    self.postMessage({
      type: 'warrens', inside: true, down: [...this.down],
      fight: f ? { boss: f.boss.key, t: f.t, phase: f.phase, bodies: this.bossBodies(f.boss.key).filter((m) => !m.dead).map((m) => ({ id: m.id, x: m.x, z: m.z, yaw: m.yaw, hp: m.hp / m.maxHp, flying: !!m.flying, breathing: !!m.breathing, spin: m.spin > 0, turning: f.turn?.m === m })), adds: this.adds().map((a) => ({ id: a.id, x: a.x, z: a.z })) } : null,
      hazards: this.hazards.map((h) => ({ x: h.x, z: h.z, r: h.r, live: h.kind === 'pool' ? h.t >= h.fuse : true })),
    });
  }
}

export { terrainHeight };
