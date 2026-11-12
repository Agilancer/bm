// The party dungeons on the sim thread (src/core/dungeon.js says where everything is, in each of them): the portals in and
// out, the packs' rooms, their patrols and the reinforcements that come through a door, the boss fights and what each
// does, a wipe, and the way it all comes back after one. One Warrens runs all of them (sim.warrens: the Hollowfang
// Warrens were the first, and the name stayed): you're in one delve at a time, and it's this.delve.
//
// The Warrens' own three bosses are written out below, a method each. The others' (Blackvigil Keep's four, the Howling
// Deeps' three) are data in src/sim/delve-fights.js, run by run() and play() here: a deck of moves, adds at so much of
// its life, an enrage, and a step of its own for whatever's particular to it.
//
// The fights are scripted the way an MMO's dungeon is: each boss has things it does on a clock or at so much of its life,
// called out as it does them (EV.DELVE WARN: the words are WARNINGS in src/core/dungeon.js), and something the party has to
// do about each. What lands on the ground and what flies is sim.perils' (src/sim/perils.js): a shape drawn first that then
// goes off, a patch that burns while you stand in it, a ring to jump, shots to step between; most of it by the named moves
// of src/sim/moves.js. The hired party (src/sim/hero.js companion) reads the same marks and the same calls: out of the
// shapes, at the dragon's sides, behind a pillar.
import { ADDS, BOSSES, DELVE, DELVES, HOLES, PARTY, PERCH, PILLARS, TURN_WARN, WARN, caveClear, caveFloorY, caveRoom, delveByKey, delveOf, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { FIGHTS } from './delve-fights.js';
import { markOut } from '../core/perils.js';
import { MOVES, tipBody } from './moves.js';
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
// Skrit's fire pots' pools: what standing in one costs a second, and how long it burns (the moves' own are 29 and 6). The
// healer mends some 22 a second: at 29 for 6 a player who stood in one lived through every fight, at 40 for 8 they fell in
// 22 to 47 s, and at 50 for 12 to the first pots, in 13.
const POTS = { dps: 40, life: 8 };

export class Warrens {
  constructor(sim) {
    this.sim = sim;
    this.inside = false;
    this.delve = null;             // the delve you're in (src/core/dungeon.js DELVES), or the last you were
    this.down = new Set();         // bosses dead
    this.fight = null;             // the boss fight on, if there is one
    this.portalCd = 0;
    this.leftAt = {};              // when you last left each delve, by its key
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
    const was = this.inside, here = delveOf(p.x, p.z);
    this.inside = !!here;
    if (here) this.delve = here;
    if (was && !this.inside) this.leftAt[this.delve.key] = sim.time;
    // A long while away and its dead are back, and its bosses with them.
    if ((sim.tick & 63) === 0) for (const d of DELVES) if (d !== here && sim.time - (this.leftAt[d.key] ?? -1e9) > RESET_AFTER && this.anyCleared(d)) this.resetAll(d);
    if (!p.dead && sim.gameState === 0) this.portals();
    // (A pack once cleared is kept so, through a death: afterRestart.)
    const t = sim.tripo;
    if (t && (sim.tick & 31) === 0) for (const l of t.lairs) if (l.dungeon && !l.add && l.state === 'cleared') l.clearedOnce = true;
    if (!this.inside) { if (was) this.clearGround(); this.fight = null; return; }
    this.dt = dt;
    this.stepPacks(dt);
    this.stepBosses(dt);
    this.post(dt);
  }

  anyCleared(d) { return BOSSES.some((b) => b.delve === d.key && this.down.has(b.key)) || this.sim.tripo?.lairs.some((l) => l.delve === d.key && l.state === 'cleared'); }

  // In by a delve's portal out on the land (a full party only), out by the two inside it.
  portals() {
    const sim = this.sim, p = sim.player;
    if (this.portalCd > 0) return;
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r && Math.abs(p.y - sim.world.height(x, z)) < 3;
    if (!this.inside) {
      const d = DELVES.find((q) => near(q.portal.x, q.portal.z, q.portal.r));
      if (!d) return;
      const r = this.ready();
      this.portalCd = 3;
      if (!r.ok) { sim.event(EV.DELVE, DELVE.NEED, r.n, r.tanks, r.heals); return; }
      this.enter(d);
      return;
    }
    const d = this.delve, [ix, iz] = toWorld(d.exitIn.x, d.exitIn.z, d), [ox, oz] = toWorld(d.exitOut.x, d.exitOut.z, d);
    const cleared = this.down.has(d.last);
    const out = near(ix, iz, 1.6) || (cleared && near(ox, oz, 1.8));
    if (out && !this.fight) {
      this.portalCd = 3;
      // Out in front of its portal on the land, facing away from it.
      const o = d.portal;
      this.carry(o.x + Math.sin(o.yaw) * 4, o.z + Math.cos(o.yaw) * 4, o.yaw);
      this.inside = false; this.leftAt[d.key] = sim.time;
      sim.event(EV.DELVE, cleared ? DELVE.CLEAR : DELVE.LEAVE, this.downIn(d), DELVES.indexOf(d));
      if (cleared) this.resetAll(d);
    }
  }

  // Stood at a delve's way in, with your party.
  enter(d) {
    const [x, z] = toWorld(d.entry.x, d.entry.z, d);
    this.carry(x, z, d.entry.yaw);
    this.inside = true; this.delve = d;
    this.sim.event(EV.DELVE, DELVE.ENTER, this.downIn(d), DELVES.indexOf(d));
  }

  // How many of a delve's bosses are down.
  downIn(d) { return BOSSES.filter((b) => b.delve === d.key && this.down.has(b.key)).length; }

  // Everything back as it was: every pack and boss of a delve stands again (of every delve, if none is named).
  resetAll(d = null) {
    const t = this.sim.tripo;
    for (const b of BOSSES) if (!d || b.delve === d.key) this.down.delete(b.key);
    if (!d || d === this.delve) { this.fight = null; this.clearGround(); }
    if (t) for (const l of t.lairs) if (l.dungeon && (!d || l.delve === d.key)) { if (l.state === 'awake') t.sleep(l); l.state = 'asleep'; l.clearedOnce = false; l.spawned = 0; l.killed = 0; l.moreDone = false; }
    if (d) delete this.leftAt[d.key];
    this.sim.event(EV.DELVE, DELVE.RESET, d ? DELVES.indexOf(d) : -1);
  }

  // After the world is started over (a death, a load): the packs you'd killed stay dead and the bosses down stay down. If
  // you fell in a delve (was: its key), you're stood at its way in with your party, the boss you fell to back at its full life.
  afterRestart(was) {
    const sim = this.sim, t = sim.tripo, d = was === true ? this.delve || DELVES[0] : was ? delveByKey(was) : null;
    this.fight = null; this.clearGround();
    // (The clock starts again with the world: a delve left a while ago was left just now.)
    for (const k of Object.keys(this.leftAt)) this.leftAt[k] = 0;
    if (t) for (const l of t.lairs) if (l.dungeon && (l.clearedOnce || this.down.has(l.key))) l.state = 'cleared';
    if (d) {
      const [x, z] = toWorld(d.entry.x, d.entry.z, d);
      this.carry(x, z, d.entry.yaw);
      this.inside = true; this.delve = d;
      sim.event(EV.DELVE, DELVE.WIPE, this.downIn(d), DELVES.indexOf(d));
    } else {
      // (Fallen out in the world, the party comes to you.)
      const p = sim.player;
      this.party().forEach((h) => { if (h.dead || Math.hypot(h.x - p.x, h.z - p.z) > 30) sim.heroWorld.revive(h, 1, p.x - 3, p.z - 2); });
    }
  }

  // ---- what lands on the ground ---------------------------------------------------------------------------------------
  // All of it is sim.perils' (src/sim/perils.js): the marks drawn first that then go off, the patches that burn, what flies.

  clearGround() { this.sim.perils.clear(); }

  // Where a body at (x, z) should step to, out of every mark it's in (or null if it's clear). For the party.
  danger(x, z, pad = 0.8) { return this.sim.perils.danger(x, z, pad); }
  safe(x, z) { return this.sim.perils.safe(x, z); }

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
      if (b.delve !== this.delve.key || this.down.has(b.key)) continue;
      const lair = t.lairs.find((l) => l.key === b.key);
      if (!lair) continue;
      const [rx, , rz] = roomSpot(b.room), R = roomOf(b.room).r;
      const dRoom = Math.hypot(p.x - rx, p.z - rz);
      // Stood up as you come down the way to its room.
      if (lair.state === 'asleep' && dRoom < R + 30) t.wake(lair, true);
      const bodies = this.bossBodies(b.key);
      // (Stood up short, some of its places taken when it woke: laid down again, to stand up whole the next time round.
      // Without them all it's never counted down, and the dungeon can't be finished.)
      if (lair.state === 'awake' && bodies.length && lair.spawned < b.models.length && !t.loading.has(lair) && !this.fight && bodies.every((m) => !m.aggro && !m.dead)) { t.sleep(lair); continue; }
      // (Or stood up and since gone, its places taken for something else: asleep again, to stand up the next time round.)
      if (lair.state === 'awake' && lair.spawned > 0 && bodies.length < lair.spawned && !t.loading.has(lair) && this.fight?.boss !== b && bodies.every((m) => !m.aggro && !m.dead)) { t.sleep(lair); continue; }
      for (const m of bodies) if (!m.setUp) this.setUp(m, b);
      if (lair.state === 'cleared' || (bodies.length && bodies.every((m) => m.dead) && lair.spawned >= b.models.length)) {
        this.down.add(b.key); lair.state = 'cleared'; lair.clearedOnce = true;
        if (this.fight?.boss === b) { this.fight = null; this.clearGround(); }
        sim.event(EV.DELVE, DELVE.BOSS_DOWN, BOSSES.indexOf(b));
        // A boss's hoard: a few more things on the floor where it fell.
        const m = bodies[0];
        // (On top of what its body leaves: rollLoot's 20 and 21 in src/items/items.js. Nothing the Warrens' rank and file
        // drop comes near it.)
        if (m) sim.event(EV.LOOT, m.x, sim.world.height(m.x, m.z), m.z, b.key === this.delve.last ? 21 : 20, 0);
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
        if (this.fight.spec) this.run(this.fight.spec, dt, this.fight, live); else this[b.key](dt, this.fight, live);
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
    const able = live.filter((m) => !m.flying && !m.spin && !m.breathing && !m.script && m.state !== 7 && !m.noTurn);
    const [secs, hold] = f.spec?.turn || (f.boss.key === 'venomaw' ? [22, 4] : [17, 5]);
    if (!able.length || f.hold || !this.every(f, 'turn', secs)) return;
    const m = pick(able), wait = 1.3;
    f.turn = { m, at: now + wait, until: now + wait + hold, on: false };
    this.warn(TURN_WARN[f.boss.key]);
  }

  // The packs' kobolds and goblins mostly keep to the tank once he has them, but now and then one breaks off and comes
  // for you for a few seconds (two at most at once, and only one that's near): hold your ground, or get back to him. The
  // tank goes after whatever's loose (src/sim/hero.js pickFoe), and takes it back when it lets go.
  stepPacks(dt) {
    const sim = this.sim, p = sim.player, t = sim.tripo, now = sim.time;
    if (!t) return;
    for (const l of t.lairs) {
      if (!l.dungeon || l.add || l.bossLair || l.state !== 'awake' || l.delve !== this.delve.key) continue;
      // A patrol: its beat, there and back at a walk, each keeping its place in the file; till one of them sees you.
      if (l.walk) {
        const [a, b] = l.walk, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, s = (now * 0.9) % (2 * L), u = (s < L ? s : 2 * L - s) / L;
        let n = 0;
        for (const k of t.slots()) if (k.lair === l && !k.dead && !k.aggro) { const o = (n++ - 1.5) * 1.6; k.home[0] = a[0] + (b[0] - a[0]) * u + (b[0] - a[0]) / L * o; k.home[1] = a[1] + (b[1] - a[1]) * u + (b[1] - a[1]) / L * o; k.opts.roam = 0.5; }
      }
      // More of them through a door, once so many of the pack are down.
      const more = l.more;
      if (more && !l.moreDone && l.spawned && l.killed >= Math.max(1, Math.round(l.spawned * more.when))) {
        l.moreDone = true;
        const d = this.delve;
        this.spawnAdds(`${l.key}_more`, more.pick, toWorld(more.from[0], more.from[1], d), more.n, (m) => { m.aggro = true; m.opts.leash = 200; m.opts.sight = 40; }, l.pal, true, d.tough);
        sim.event(EV.ROAR, d.x + more.from[0], sim.world.height(d.x + more.from[0], d.z + more.from[1]) + 1.5, d.z + more.from[1], 0.9);
      }
    }
    if (p.dead || !this.party().some((h) => !h.dead)) return;
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
    m.opts.base = { damage: b.damage, pause: 0.9, speed: m.opts.speed };
    m.opts.hp = b.hp;
    if (b.key === 'venomaw') { m.breathCd = 1e9; m.opts.breathRange = 14; m.opts.breathDps = 26; m.opts.radius = 2.2; }
    // (A boss fights as itself, by its own deck: never a breath of its own accord, never stood stock-still because it's
    // looked at, never the bolt its kind throws between blows.)
    const spec = FIGHTS[b.key];
    if (spec) { m.breathCd = 1e9; m.castCd = 1e9; if (m.opts.ai !== 'melee') m.opts.ai = spec.ai || 'melee'; spec.setUp?.(this, m, n); }
    m.yaw = Math.atan2(this.sim.player.x - m.x, this.sim.player.z - m.z);
  }

  begin(b, live) {
    const sim = this.sim;
    this.fight = { boss: b, spec: FIGHTS[b.key] || null, t: 0, clock: {}, phase: 0, stacks: 0 };
    this.clearGround();
    for (const m of live) { m.notice(sim); m.hp = m.maxHp; }
    const [c0, c1] = live.map((m) => m.id);
    sim.event(EV.DELVE, DELVE.BOSS, BOSSES.indexOf(b), c0 ?? -1, c1 ?? -1);
    if (b.key === 'twins') this.warn(3);
    if (b.key === 'venomaw') this.warn(7);
    const spec = this.fight.spec;
    if (spec?.open) this.warn(WARN[spec.open]);
    spec?.begin?.(this, this.fight, live);
  }

  // Nobody left in the room, or you fell: it goes back to where it stood, its life back, and waits.
  endFight(b, live) {
    const sim = this.sim, [rx, , rz] = roomSpot(b.room);
    for (const m of live) {
      m.aggro = false; m.hp = m.maxHp; m.flying = false; m.liftExtra = 0; m.script = null; m.rig.poseModifier = null; m.spin = 0; m.breathing = false; m.breathHeld = false; m.act = null; m.state = 0; m.home = [rx, rz];
      m.x = rx + rnd(-2, 2); m.z = rz + rnd(-2, 2); m.y = sim.world.height(m.x, m.z); m.heroFoe = null; m.tauntBy = null; m.fixOn = null;
      m.ward = 1; m.noTurn = false; m.buried = false;
      if (m.opts.base) { m.opts.damage = m.opts.base.damage; m.opts.pause = m.opts.base.pause; m.opts.speed = m.opts.base.speed; }
    }
    // (Its adds go with it.)
    for (const a of this.adds()) a.hp = 0;
    this.fight = null; this.clearGround();
  }

  // The fight's own monsters that aren't the boss: diggers and whelps.
  adds() { const t = this.sim.tripo; return t ? t.slots().filter((k) => k instanceof TripoMonster && k.lair?.add && !k.dead) : []; }

  // A few at once, at a place, as a lair of their own; each given its part when it stands (o.setUp).
  // (id: one model, or a list to pick each from; whichever of them the roster has. tough: as a pack's.)
  spawnAdds(key, id, at, n, setUp, pal = ['Base'], tricks = false, tough = null) {
    const t = this.sim.tripo;
    if (!t) return;
    const picks = (Array.isArray(id) ? id : [id]).filter((q) => t.roster[q]);
    if (!picks.length) return;
    const lair = { key, x: at[0], z: at[1], r: 1.2, pick: picks, n, pal, wake: -1, dungeon: true, delve: this.delve?.key, add: true, temp: true, tricks, tough, state: 'asleep', at: -1e9, onSpawn: setUp };
    t.lairs.push(lair);
    t.wake(lair);
  }

  every(f, name, secs) {
    const c = f.clock;
    if (c[name] === undefined) c[name] = secs * rnd(0.5, 0.8);
    c[name] -= this.dt;
    if (c[name] > 0) return false;
    c[name] = secs * rnd(0.9, 1.15);
    return true;
  }

  // ---- the fights' own moves ------------------------------------------------------------------------------------------
  // Everything a boss throws or marks on the ground goes through sim.perils (src/sim/perils.js), most of it by the moves
  // in src/sim/moves.js. Each boss has a deck of them: every few seconds the next one it's free to make, never the same
  // twice running, so there's always something on the floor to be out of or in the air to be clear of.

  // Whoever isn't the tank (anyone, if that's all there is); and one of them: you, half the time.
  others() { const all = this.bodies(), rest = all.filter((b) => b.role !== 'tank'); return rest.length ? rest : all; }
  mark() { const p = this.sim.player, rest = this.others(); return !p.dead && Math.random() < 0.5 ? p : pick(rest); }

  // The next of a boss's moves when its time comes round and its body is its own. Each is a method here: it says false if
  // it couldn't be made just now, and is tried again.
  deck(f, m, secs, list) {
    const d = (f.decks ||= {})[m.id] ||= { t: secs * rnd(0.5, 0.8), bag: [], last: null };
    d.t -= this.dt;
    if (d.t > 0 || m.script || m.breathing || m.state !== 0 || f.turn?.m === m) return;
    if (!d.bag.length) { d.bag = list.filter((n) => n !== d.last).sort(() => Math.random() - 0.5); }
    const name = d.bag.pop(), mv = f.spec?.moves[name];
    if ((mv ? this.play(f, m, mv) : this[name](f, m)) === false) return;
    d.last = name; d.t = secs * rnd(0.85, 1.15);
  }

  // ---- a fight that's data (src/sim/delve-fights.js) ---------------------------------------------------------------------
  // spec: open (a call as it begins), pace ([seconds between moves, the same once it's hurt, below what share of its life]),
  // deck (the moves' names; or decks, by model, where there are two bodies; either may be a function of the fight),
  // moves (name -> a move, below), adds (more of them at so much of its life), enrage ([seconds, times the damage, a call]),
  // turn ([how often it turns on you, for how long]), and begin/step/setUp for whatever's its own.

  run(spec, dt, f, live) {
    spec.step?.(this, f, live, dt);
    const hp = live.reduce((a, m) => a + m.hp, 0), max = live.reduce((a, m) => a + m.maxHp, 0), frac = hp / max;
    if (!f.hold) {
      const pace = spec.pace || [4.4, 3.4, 0.35];
      for (const m of live) {
        let list = spec.decks ? spec.decks[m.opts.model] : spec.deck;
        if (typeof list === 'function') list = list(f, m);
        if (list?.length) this.deck(f, m, (m.hp / m.maxHp < pace[2] || f.fast ? pace[1] : pace[0]) * (f.wild ? 0.8 : 1), list);
      }
    }
    (spec.adds || []).forEach((a, i) => { if (frac < a.at && !f[`adds${i}`]) { f[`adds${i}`] = true; this.callAdds(f, live[0], a); } });
    const e = spec.enrage;
    if (e && f.t > e[0] && !f.enraged) { f.enraged = true; for (const m of live) m.opts.damage *= e[1]; if (e[2]) this.warn(WARN[e[2]]); }
  }

  // One move of a deck. who: whom it's for ('mark': one of you, you half the time; 'far': whoever's furthest off; 'none').
  // clip: what the body plays (null: the move moves the body itself). at: when in that it goes off (else at once, the clip
  // played over its warning). warn: its call. go(W, f, m, target, perils): the move.
  play(f, m, mv) {
    const t = mv.who === 'none' ? null : mv.who === 'far' ? this.farthest(m) : this.mark();
    if (mv.who !== 'none' && (!t || t.dead)) return false;
    if (mv.when && !mv.when(this, f, m)) return false;
    const go = () => mv.go(this, f, m, t, this.sim.perils);
    if (mv.clip !== null && !m.perform({ clip: mv.clip, face: mv.face === false ? null : t, at: mv.at ?? 0.45, secs: mv.secs ?? 1.3, fn: mv.at !== undefined ? () => { if (!m.dead) go(); } : null })) return false;
    if (mv.at === undefined) go();
    if (mv.warn) this.warn(WARN[mv.warn], mv.gap ?? 25);
    return true;
  }

  farthest(m) { return this.others().reduce((a, b) => (Math.hypot(b.x - m.x, b.z - m.z) > Math.hypot(a.x - m.x, a.z - m.z) ? b : a), this.sim.player); }
  tank(m) { const t = foeOf(m, this.sim); return t?.role === 'tank' ? t : null; }

  // More of them, part way through: n of pick, from the doors of the boss's room (the delve's dead-end passages), from
  // round the room's edge, or from where the boss stands. Each given hp, damage and a name, and set on you.
  callAdds(f, m, a) {
    const d = this.delve, room = roomOf(f.boss.room), [rx, , rz] = roomSpot(room.id);
    let from = [];
    if (a.from === 'doors') from = d.tunnels.filter((t) => t.dead && (!t.door || t.door === room.id) && Math.hypot(t.pts[0][0] - room.x, t.pts[0][1] - room.z) < room.r * 1.5 + 12).map((t) => toWorld(t.pts[t.pts.length - 1][0], t.pts[t.pts.length - 1][1], d));
    if (a.from === 'edge' || !from.length) for (let i = 0; i < (a.places || 3); i++) { const ang = Math.random() * 6.28; from.push([rx + Math.sin(ang) * room.r * 0.7, rz + Math.cos(ang) * room.r * 0.7]); }
    if (a.from === 'boss') from = [[m.x, m.z]];
    if (a.warn) this.warn(WARN[a.warn]);
    const each = Math.ceil(a.n / from.length);
    let left = a.n;
    f.addN = (f.addN || 0) + 1;
    from.forEach((at, i) => {
      const n = Math.min(each, left);
      left -= n;
      if (n > 0) this.spawnAdds(`${f.boss.key}_adds_${f.addN}_${i}`, a.pick, at, n, (k) => { k.hp = k.maxHp = a.hp; k.opts.damage = a.damage; if (a.name) k.opts.name = a.name; if (a.speed) k.opts.speed = a.speed; k.aggro = true; k.opts.leash = 200; k.opts.sight = 60; a.setUp?.(this, k, m); }, a.pal || ['Base'], a.tricks ?? false);
      this.sim.event(EV.ROAR, at[0], this.sim.world.height(at[0], at[1]) + 1.5, at[1], 0.8);
    });
  }

  // The one the party should be striking, where it matters (the Hollow Brothers: the one who covers). Else null.
  focus() { const f = this.fight; return f?.spec?.focus ? f.spec.focus(this, f) : null; }
  // Where one of yours should stand against m, where the fight says (hero.js stance). Else null.
  stanceFor(h, m) { const f = this.fight; return f?.spec?.stance ? f.spec.stance(this, f, h, m) : null; }

  // ---- Grubnash: the cave-in, the split floor, the boulder, the stamp, his diggers ----------------------------------------

  grubnash(dt, f, [m]) {
    const sim = this.sim, frac = m.hp / m.maxHp;
    this.deck(f, m, frac < 0.35 ? 3.3 : 4.3, ['gCavein', 'gFissure', 'gBoulder', 'gStomp', 'gRubble']);
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
    if (f.t > 170 && !f.enraged) { f.enraged = true; m.opts.damage *= 2; this.warn(15); }
  }

  // The roof comes down: a circle under each of you, and more wherever.
  gCavein(f, m) {
    const sim = this.sim, P = sim.perils;
    if (!m.perform({ clip: 'roar', secs: 1.3 })) return false;
    this.warn(0, 20);
    for (const b of this.bodies()) P.mark({ x: b.x, z: b.z, r: 2.6, fuse: 2.2, dmg: 69, knock: 2, elem: ELEM.STONE, follow: b, lock: 0.45, tag: 'cavein' });
    P.rain(m.x, m.z, 17, f.stacks + 4, 1.4, { r: 2.3, fuse: 1.8, dmg: 60, knock: 2, elem: ELEM.STONE, tag: 'cavein' });
    sim.event(EV.ROAR, m.x, m.y + 2, m.z, 1.2);
  }

  // His pick through the floor: a line of it, or three once he's hurt.
  gFissure(f, m) {
    const t = this.mark();
    if (!t || !m.perform({ clip: 'atk3', face: t, secs: 1.3 })) return false;
    this.warn(20, 25);
    MOVES[m.hp < m.maxHp * 0.5 ? 'fissures' : 'fissure'](this.sim.perils, m, t, 26, { r: 18, w: 1.3, fuse: 1.1 });
  }

  // A boulder at whoever's furthest off, that bursts into shards.
  gBoulder(f, m) {
    const t = this.others().reduce((a, b) => (Math.hypot(b.x - m.x, b.z - m.z) > Math.hypot(a.x - m.x, a.z - m.z) ? b : a), this.sim.player);
    if (!t || t.dead) return false;
    if (!m.perform({ clip: 'atk1', face: t, at: 0.4, secs: 1.2, fn: () => MOVES.boulder(this.sim.perils, m, t, 27) })) return false;
    this.warn(21, 25);
  }

  // A stamp that sends a ring out along the floor.
  gStomp(f, m) {
    if (!m.perform({ clip: 'jump', at: 0.5, secs: 1.4, fn: () => MOVES.quakeWave(this.sim.perils, m, null, 32, { reach: 24, speed: 10 }) })) return false;
    this.warn(22, 25);
  }

  // Rubble coming up in a row, at one of you.
  gRubble(f, m) {
    const t = this.mark(), P = this.sim.perils;
    if (!t || !m.perform({ clip: 'atk2', face: t, at: 0.4, secs: 1.2, fn: () => P.march(m.x, m.z, Math.atan2(t.x - m.x, t.z - m.z), 9, 2.3, 0.15, { r: 1.7, fuse: 0.85, dmg: 51, knock: 2, elem: ELEM.STONE, from: m, tag: 'rubble' }) })) return false;
  }

  // A digger runs for its master and nothing else; it only fights back if it's cornered.
  digger(d, boss) {
    d.hp = d.maxHp = 260; d.opts.speed = 1.7; d.opts.name = 'DIGGER';
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

  // ---- Skrit and Skrat: the shared pain; fire from the one, blades from the other -----------------------------------------

  twins(dt, f, live) {
    const sim = this.sim;
    const skrit = live.find((m) => m.opts.model === 'hf_skrit'), skrat = live.find((m) => m.opts.model === 'hf_skrat');
    // Shared pain: the one with less life left takes half of what lands on it.
    if (skrit && skrat) {
      const a = skrit.hp / skrit.maxHp, b = skrat.hp / skrat.maxHp;
      skrit.shrug = a < b - 0.15 ? 0.5 : 1; skrat.shrug = b < a - 0.15 ? 0.5 : 1;
      if (Math.abs(a - b) > 0.15) this.warn(3, 14);
    } else {
      const last = skrit || skrat;
      if (last && !f.wild) { f.wild = true; last.shrug = 1; last.opts.damage *= 1.6; last.opts.pause = 0.5; this.warn(6); sim.event(EV.ROAR, last.x, last.y + 2, last.z, 1.3); }
    }
    // How long each of you has stood in one place (within a stride of it), for Skrit's pots.
    const still = f.still ||= new Map();
    for (const b of this.bodies()) {
      const w = still.get(b);
      if (!w || Math.hypot(b.x - w.x, b.z - w.z) > 0.6) still.set(b, { x: b.x, z: b.z, t: 0 });
      else w.t += dt;
    }
    if (skrit) this.deck(f, skrit, f.wild ? 3 : 5, ['sPots', 'sFan', 'sWheel', 'sWall']);
    if (skrat && !skrat.spin) this.deck(f, skrat, f.wild ? 3.2 : 5.6, ['kWhirl', 'kDash', 'kNova']);
    if (f.t > 200 && !f.enraged) { f.enraged = true; for (const m of live) m.opts.damage *= 2; }
  }

  // Skrit: three pots of fire in a row across one of you. Each leaves a pool that burns a long while, and hotter than the
  // healer can mend: one step out of it and it's a bite or two; stood in it, it's the end of you, healer or no.
  // He throws them at whoever's stood longest in one place, if anyone has for two seconds (not the tank, who must), and
  // otherwise at one of you as his other moves are.
  sPots(f, m) {
    let t = null, longest = 2;
    for (const b of this.others()) { const w = f.still?.get(b); if (w && w.t >= longest) { longest = w.t; t = b; } }
    t ||= this.mark();
    if (!t || !m.perform({ clip: 'atk1', face: t, at: 0.4, secs: 1.2, fn: () => MOVES.firepots(this.sim.perils, m, t, 22, POTS) })) return false;
    this.warn(4, 20);
  }

  // Bolts of fire, fanned, and a second fan through the gaps of the first.
  sFan(f, m) {
    const t = this.mark(), P = this.sim.perils;
    if (!t || !m.perform({ clip: 'atk2', face: t, at: 0.4, secs: 1.5, fn: () => {
      MOVES.fireFan(P, m, t, 19, { n: 5, spread: 1 });
      P.later(0.5, () => { if (!m.dead) MOVES.fireFan(P, m, t, 19, { n: 4, spread: 0.75 }); });
    } })) return false;
  }

  // Crossed bars of fire, turning.
  sWheel(f, m) {
    if (!m.perform({ clip: 'roar', secs: 1.3 })) return false;
    this.warn(23, 25);
    MOVES.fireWheel(this.sim.perils, m, null, 24, { r: 11, life: 6, spin: Math.random() < 0.5 ? 0.75 : -0.75 });
  }

  // A row of fire coming on, with a way through.
  sWall(f, m) {
    const t = this.mark();
    if (!t || !m.perform({ clip: 'atk4', face: t, at: 0.45, secs: 1.2, fn: () => MOVES.boltWall(this.sim.perils, m, t, 19, { width: 17, n: 10, speed: 7.5 }) })) return false;
  }

  // Skrat: the whirlwind. He spins after whoever he's on, cutting all within reach, and blades fly off him as he turns.
  // (Anyone with a blade can: call names its warning, hit and nova how hard it cuts and how hard its blades fly.)
  kWhirl(f, m, call = 5, hit = 22, nova = 16) {
    const P = this.sim.perils;
    this.warn(call, 20);
    m.spin = 3.6;
    const clip = pick(m.rig.attacks);
    let n = 0;
    m.script = (k, dt2, s2, foe) => {
      k.spin -= dt2;
      if (k.spin <= 0 || k.dead) { k.spin = 0; k.script = null; k.state = 0; k.setClip(k.idleClip); return false; }
      k.yaw += dt2 * 9;
      const L = Math.hypot(foe.x - k.x, foe.z - k.z) || 1;
      k.vx = (foe.x - k.x) / L * 1.6; k.vz = (foe.z - k.z) / L * 1.6;
      if (k.clip !== clip) k.setClip(clip);
      k.t = (k.t + dt2 * 1.4) % k.rig.clips[clip].dur;
      k.spinTick = (k.spinTick || 0) - dt2;
      if (k.spinTick <= 0) {
        k.spinTick = 0.5;
        for (const b of this.bodies()) if (Math.hypot(b.x - k.x, b.z - k.z) < 4.5) P.hurt(b, hit, k.x, k.z, 1.5, false, 'whirl');
        s2.event(EV.WHOOSH, k.x, k.y + 1.2, k.z);
        if (n++ % 2 === 1) MOVES.bladeNova(P, k, null, nova, { n: 8, speed: 9.5, turn: n * 0.39 });
      }
      if ((s2.tick & 3) === 0) s2.casting.burst(FX.RING, ELEM.SPIRIT, k.x, k.y + 1, k.z, 1.5, 4.5, 0.3, { alpha: 0.5 });
      return true;
    };
  }

  // A line marked to one of you, and then he comes down it.
  kDash(f, m) {
    const t = this.mark();
    if (!t) return false;
    this.warn(24, 25);
    MOVES.ram(this.sim.perils, m, t, 25, { r: 17, w: 1.3, elem: ELEM.SPIRIT });
  }

  // Blades all round, and again through the gaps.
  kNova(f, m) {
    const P = this.sim.perils;
    if (!m.perform({ clip: 'roar', at: 0.45, secs: 1.5, fn: () => {
      const a = Math.random() * 6.28;
      MOVES.bladeNova(P, m, null, 18, { n: 12, speed: 10, turn: a });
      P.later(0.55, () => { if (!m.dead) MOVES.bladeNova(P, m, null, 18, { n: 12, speed: 10, turn: a + 0.26 }); });
    } })) return false;
    this.warn(25, 25);
  }

  // ---- Venomaw: breath, tail, claws and wings on the ground; the swoops, the breath across the hoard and the dive from the air ----

  venomaw(dt, f, [m]) {
    const frac = m.hp / m.maxHp;
    // (Her breath over: her head's her own again.)
    if (m.breathing && m.state !== 4) { m.breathing = false; m.breathHeld = false; m.breathCd = 1e9; }
    if (f.phase === 0 && frac < 0.6 && !m.script && !m.breathing && m.state === 0) { this.takeOff(f, m); return; }
    if (f.phase === 1) return;
    this.deck(f, m, f.phase === 2 ? 3.3 : 4.4, f.phase === 2 ? ['vBreath', 'vAcid', 'vTail', 'vRake', 'vWings', 'vStomp', 'vRain', 'vSpiral'] : ['vBreath', 'vAcid', 'vTail', 'vRake', 'vWings', 'vStomp']);
    if (f.t > 300 && !f.enraged) { f.enraged = true; m.opts.damage *= 3; this.warn(16); }
  }

  // Her breath: a cone before her, aimed as she draws it and held there. Everything in it burns but the tank, who has her
  // own breath to stand in (src/sim/tripo.js breathe).
  vBreath(f, m) {
    const sim = this.sim, clip = m.rig.clips.breath2 && Math.random() < 0.4 ? 'breath2' : 'breath';
    if (!m.rig.clips[clip] || f.turn?.on) return false;
    this.warn(8, 20);
    m.breathing = true; m.breathHeld = true; m.state = 4; m.setClip(clip); m.t = 0;
    const w = m.meta.breathWin || [0.25, 0.8], dur = m.rig.clips[clip].dur, tank = foeOf(m, sim);
    sim.perils.mark({ shape: 'cone', ride: m, r: 16, half: 0.6, fuse: w[0] * dur, life: (w[1] - w[0]) * dur, dps: 69, elem: ELEM.POISON, from: m, tag: 'breath',
      spare: (b) => b === tank && b.role === 'tank' });
  }

  // Acid, spat high: a pool where each gob lands.
  vAcid(f, m) {
    const P = this.sim.perils, p = this.sim.player;
    const who = [...new Set([p.dead ? null : p, ...this.others().sort(() => Math.random() - 0.5)])].filter(Boolean).slice(0, 3);
    if (!who.length || !m.perform({ clip: 'atk2', face: who[0], at: 0.5, secs: 1.4, fn: () => {
      const from = [m.x + Math.sin(m.yaw) * 3, m.y + m.meta.height * 0.7, m.z + Math.cos(m.yaw) * 3];
      who.forEach((b, i) => P.later(i * 0.18, () => { if (!m.dead) P.lob(from, { x: b.x, z: b.z, r: 2.8, dmg: 33, life: 9, dps: 27, elem: ELEM.POISON, follow: b, lock: 0.5, from: m, tag: 'acid' }, { time: 1.4, look: 'orb', size: 0.42 }); }));
    } })) return false;
    this.warn(9, 20);
  }

  // Her tail, right round behind her, and the floor rings with it.
  vTail(f, m) {
    this.warn(26, 25);
    MOVES.tailWhip(this.sim.perils, m, null, 58, { r: 11.5 });
  }

  // Her claws: three furrows fanned out before her.
  vRake(f, m) {
    const t = this.mark();
    if (!t || !m.perform({ clip: pick(['atk1', 'atk3', 'atk4']), face: null, at: 0.9, secs: 1.5 })) return false;
    this.warn(27, 25);
    const yaw = Math.atan2(t.x - m.x, t.z - m.z);
    for (const a of [-0.4, 0, 0.4]) this.sim.perils.mark({ shape: 'line', x: m.x, z: m.z, yaw: yaw + a, r: 15, w: 1, fuse: 1.1, dmg: 63, knock: 3, elem: ELEM.POISON, from: m, tag: 'rake' });
  }

  // Her wings beaten: gobs flung out all round, twice.
  vWings(f, m) {
    const P = this.sim.perils;
    if (!m.perform({ clip: 'roar', at: 0.6, secs: 1.8, fn: () => {
      const a = Math.random() * 6.28, o = { x: m.x, y: m.y + 1.3, z: m.z, speed: 8.5, dmg: 30, elem: ELEM.POISON, size: 0.3, life: 3, from: m, tag: 'wings' };
      P.nova(o, 14, a);
      P.later(0.6, () => { if (!m.dead) P.nova(o, 14, a + 0.224); });
    } })) return false;
    this.warn(28, 25);
  }

  // A stamp: three rings out from her, one after another.
  vStomp(f, m) {
    if (!m.perform({ clip: m.rig.clips.land ? 'land' : 'jump', secs: 1.6 })) return false;
    this.warn(32, 25);
    MOVES.stompRings(this.sim.perils, m, null, 38, { r: 5.5, elem: ELEM.POISON });
  }

  // Frenzied: venom from the roof, all over where you stand.
  vRain(f, m) {
    const t = this.mark();
    if (!t || !m.perform({ clip: 'roar', secs: 1.4 })) return false;
    this.warn(31, 25);
    this.sim.perils.rain(t.x, t.z, 12, 11, 3, { r: 2.5, fuse: 1.4, dmg: 51, elem: ELEM.POISON, tag: 'rain' });
  }

  // And gobs poured out of her in turning streams.
  vSpiral(f, m) {
    if (!m.perform({ clip: 'roar', at: 0.5, secs: 3.4, fn: () => MOVES.spiral(this.sim.perils, m, null, 22, { arms: 4, secs: 2.8, turn: Math.random() < 0.5 ? 1.5 : -1.5 }) })) return false;
    this.warn(28, 25);
  }

  // Into the air at six tenths of her life: her whelps hatch, and the flight below is hers till she comes down.
  takeOff(f, m) {
    f.phase = 1;
    this.warn(10);
    m.flying = true; m.state = 0;
    this.spawnAdds('hf_whelps_1', ADDS.whelp, [m.x, m.z], 3, (w) => this.whelp(w), ['Blighted'], true);
    this.warn(12);
    const air = f.air = { stage: 'rise', t: 0, n: 0, pitch: 0, roll: 0, yawWas: m.yaw };
    m.rig.poseModifier = (rot) => tipBody(m.rig, rot, air.pitch, air.roll);
    m.script = (k, dt2, s2) => this.fly(k, dt2, s2, f);
  }

  // Her flight, stage by stage: up; two swoops down the hoard, each along a strip marked first and left burning; to her
  // perch, to breathe across the whole cavern (only rock between her and you keeps that off); then a dive onto one of you.
  fly(k, dt, sim, f) {
    const a = f.air, P = sim.perils, [cx, , cz] = roomSpot('lair'), R = roomOf('lair').r - 5;
    a.t += dt;
    const clips = k.rig.clips, set = (n, loop = true) => { const c = clips[n] ? n : clips.fly ? 'fly' : k.idleClip; if (k.clip !== c) k.setClip(c); k.t = loop ? (k.t + dt) % clips[c].dur : Math.min(clips[c].dur, k.t + dt); };
    const turnTo = (yaw, rate) => { k.yaw += clamp(wrapAngle(yaw - k.yaw), -dt * rate, dt * rate); };
    // To (x, z), to be there in `left` seconds, no faster than top.
    const goTo = (x, z, left, top = 30) => { const dx = x - k.x, dz = z - k.z, d = Math.hypot(dx, dz), v = Math.min(top, d / Math.max(left, dt)); k.vx = d > 0.05 ? dx / d * v : 0; k.vz = d > 0.05 ? dz / d * v : 0; return d; };
    const lift = (to, rate) => { k.liftExtra = (k.liftExtra || 0) + clamp(to - (k.liftExtra || 0), -dt * rate, dt * rate); };
    const next = (stage) => { a.stage = stage; a.t = 0; };
    let pitch = 0;
    switch (a.stage) {
      case 'rise': {
        k.vx = k.vz = 0;
        set(a.t < 0.9 && clips.jump ? 'jump' : 'fly', a.t >= 0.9);
        lift(5, 3.5);
        if (a.t > 1.8) next('aim');
        break;
      }
      case 'aim': {
        // The strip: through one of you, right across the room, from the side she's nearer.
        if (!a.line) {
          const t = this.mark() || sim.player, ang = Math.random() * Math.PI;
          const dx = Math.sin(ang), dz = Math.cos(ang), ox = t.x - cx, oz = t.z - cz, b = ox * dx + oz * dz, disc = b * b - (ox * ox + oz * oz - R * R);
          const h = Math.sqrt(Math.max(disc, 1)), ends = [[t.x + dx * (-b - h), t.z + dz * (-b - h)], [t.x + dx * (-b + h), t.z + dz * (-b + h)]];
          if (Math.hypot(ends[1][0] - k.x, ends[1][1] - k.z) < Math.hypot(ends[0][0] - k.x, ends[0][1] - k.z)) ends.reverse();
          const len = Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]);
          a.line = { from: ends[0], to: ends[1], yaw: Math.atan2(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]), len };
          P.mark({ shape: 'line', x: ends[0][0], z: ends[0][1], yaw: a.line.yaw, r: len, w: 3.3, fuse: 2, dmg: 82, life: 5, dps: 39, elem: ELEM.POISON, from: k, tag: 'swoop' });
          this.warn(29, 12);
        }
        set('fly');
        lift(5, 3);
        const d = goTo(a.line.from[0], a.line.from[1], 1.7 - a.t, 26);
        turnTo(d > 2 ? Math.atan2(k.vx, k.vz) : a.line.yaw, 5);
        if (a.t >= 2) { next('swoop'); sim.event(EV.ROAR, k.x, k.y + 4, k.z, 1.4); }
        break;
      }
      case 'swoop': {
        // Low and fast down the strip, her breath under her.
        const secs = 1.5, L = a.line;
        set(clips.fly2 ? 'fly2' : 'fly');
        lift(2.6, 6);
        pitch = 0.3;
        goTo(L.to[0], L.to[1], secs - a.t, 40);
        turnTo(L.yaw, 8);
        if ((sim.tick & 3) === 0) {
          const g = caveFloorY(k.x, k.z);
          sim.casting.burst(FX.PUFF, ELEM.POISON, k.x + rnd(-2, 2), g + 0.8, k.z + rnd(-2, 2), 1, 3.2, 1, { alpha: 0.75, light: 5, lightR: 8 });
          sim.casting.burst(FX.FLAME, ELEM.POISON, k.x, g + 0.2, k.z, 1.4, 3, 0.7, { alpha: 0.8, len: 2 });
        }
        if (a.t >= secs) { a.line = null; a.n++; next(a.n < 2 ? 'aim' : 'perch'); if (a.stage === 'perch') { f.perch = true; this.warn(10); } }
        break;
      }
      case 'perch': {
        const [px, pz] = toWorld(PERCH.x, PERCH.z);
        set('fly');
        lift(PERCH.up + 2, 3);
        const d = goTo(px, pz, 0.1, 13);
        turnTo(d > 1.5 ? Math.atan2(px - k.x, pz - k.z) : Math.atan2(cx - k.x, cz - k.z), 3);
        if (!a.flame && (d < 1.5 || a.t > 4)) { a.flame = 2.4; this.warn(11); sim.event(EV.ROAR, k.x, k.y + 5, k.z, 1.6); }
        if (a.flame) {
          a.flame -= dt;
          pitch = 0.25;
          if (a.flame <= 0) {
            const mouth = [k.x, k.y + k.meta.height * 0.6 + k.hover, k.z];
            for (const b of this.bodies()) {
              if (!caveClear(mouth[0], mouth[2], b.x, b.z, 0.05)) continue;
              P.hurt(b, 110, k.x, k.z, 1, false, 'hoardBreath');
              sim.event(EV.BURN, b.x, b.y + 1, b.z);
            }
            for (let i = 0; i < 10; i++) {
              const ang = Math.atan2(cx - k.x, cz - k.z) + (i - 4.5) * 0.12;
              sim.casting.burst(FX.FLAME, ELEM.POISON, k.x + Math.sin(ang) * 8, mouth[1] - 3, k.z + Math.cos(ang) * 8, 1.2, 4, 1.1, { alpha: 0.8, light: 6, lightR: 10 });
              sim.casting.burst(FX.PUFF, ELEM.POISON, k.x + Math.sin(ang) * 18, caveFloorY(k.x, k.z) + 1, k.z + Math.cos(ang) * 18, 1.5, 5, 1.6, { alpha: 0.6 });
            }
            f.perch = false; a.flame = 0;
            next('dive');
          }
        }
        break;
      }
      default: {
        // The dive: a circle under one of you, that follows a while, and then she's in it.
        const fuse = 2.1;
        if (!a.spot) {
          const t = this.mark() || sim.player;
          a.spot = P.mark({ x: t.x, z: t.z, r: 7.5, fuse, dmg: 112, knock: 8, elem: ELEM.POISON, follow: t, lock: 0.5, from: k, tag: 'dive',
            then: (q) => P.wave(q.x, q.z, { speed: 11, reach: 26, touch: 45, knock: 3, elem: ELEM.POISON, r: 7.5, tag: 'diveWave' }) });
          this.warn(30);
        }
        const left = fuse - a.t, s = a.spot;
        set(left < 0.7 && clips.land ? 'land' : 'fly', !(left < 0.7 && clips.land));
        goTo(s.x, s.z, Math.max(left - 0.25, 0.05), 30);
        turnTo(Math.hypot(k.vx, k.vz) > 2 ? Math.atan2(k.vx, k.vz) : k.yaw, 5);
        lift(left < 0.6 ? 0 : 6, left < 0.6 ? 14 : 3);
        pitch = left < 0.9 ? 0.45 : 0.15;
        if (left <= 0) {
          // Down, and frenzied.
          k.flying = false; k.liftExtra = 0; k.script = null; k.rig.poseModifier = null; k.vx = k.vz = 0; k.state = 0; k.setClip(k.idleClip);
          f.phase = 2; f.air = null;
          this.warn(13);
          k.opts.damage *= 1.25;
          sim.event(EV.GROUND, k.x, k.y, k.z); sim.event(EV.ROAR, k.x, k.y + 3, k.z, 1.6);
          this.spawnAdds('hf_whelps_2', ADDS.whelp, [k.x, k.z], 2, (w) => this.whelp(w), ['Blighted'], true);
          return true;
        }
      }
    }
    // Nose down as she comes on, and over on a wing as she turns.
    const turned = wrapAngle(k.yaw - a.yawWas) / Math.max(dt, 1e-4);
    a.yawWas = k.yaw;
    a.pitch += (pitch - a.pitch) * Math.min(1, dt * 4);
    a.roll += (clamp(-turned * 0.22, -0.6, 0.6) - a.roll) * Math.min(1, dt * 3);
    return true;
  }

  // Where to hide from the breath across the hoard: the side of the nearest pillar away from her perch (for the party).
  // Null unless she's on her way to it or on it.
  hideFrom(x, z) {
    const f = this.fight;
    if (!f || f.boss.key !== 'venomaw' || f.phase !== 1 || !f.perch) return null;
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

  whelp(w) { w.hp = w.maxHp = 300; w.opts.damage = 9; w.opts.name = 'WHELP'; w.aggro = true; w.opts.leash = 200; }

  // For tests and reviews (bm.warrens in src/main.js): in at a delve's way in (delve: its key; the Warrens unless it says),
  // straight to a boss's door (boss: its key, or n: its place among that delve's), or to a room's middle (room: its id);
  // a boss nearly dead; everything stood up again.
  debug(m) {
    const sim = this.sim;
    const boss = m.boss ? BOSSES.find((b) => b.key === m.boss) : null;
    const d = delveByKey(boss?.delve || (m.room && roomOf(m.room)?.delve.key) || m.delve || 'warrens') || DELVES[0];
    const mine = BOSSES.filter((b) => b.delve === d.key), b = boss || mine[m.n | 0];
    if (m.cmd === 'enter' || m.cmd === 'boss' || m.cmd === 'room') {
      let [x, z] = toWorld(d.entry.x, d.entry.z, d), yaw = d.entry.yaw;
      if (m.cmd === 'room' && roomOf(m.room)) { const [rx, , rz] = roomSpot(m.room, m.dx || 0, m.dz || 0); yaw = Math.atan2(rx - x, rz - z); x = rx; z = rz; }
      if (m.cmd === 'boss' && b) {
        const r = roomOf(b.room), [rx, rz] = toWorld(r.x, r.z, d);
        // (At the room's edge, on the side of the way in: a few strides down the passage that's the shortest walk from it.)
        const nav = sim.world.caveNav(x, z);
        let best = null, bd = Infinity;
        for (let a = 0; a < 6.28; a += 0.1) {
          const qx = rx + Math.sin(a) * (r.r + 4), qz = rz + Math.cos(a) * (r.r + 4);
          if (caveRoom(qx, qz) < 1.2) continue;
          const dd = nav.walkDist(qx, qz, x, z, sim.time);
          if (dd < bd) { bd = dd; best = [qx, qz]; }
        }
        if (best) { [x, z] = best; yaw = Math.atan2(rx - x, rz - z); }
        for (const q of mine.slice(0, mine.indexOf(b))) this.down.add(q.key);
      }
      this.carry(x, z, yaw);
      this.inside = true; this.delve = d;
    }
    if (m.cmd === 'hurt' && b) for (const k of this.bossBodies(b.key)) if (!k.dead) k.hp = k.maxHp * (m.frac ?? 0.05);
    if (m.cmd === 'reset') this.resetAll(m.delve ? d : null);
  }

  // The fight as the page needs it, a few times a second (auto-play reads it, and the boss's frame).
  post(dt) {
    if ((this.postT -= dt) > 0) return;
    this.postT = 0.2;
    const f = this.fight;
    self.postMessage({
      type: 'warrens', inside: true, delve: this.delve.key, down: [...this.down],
      fight: f ? { boss: f.boss.key, t: f.t, phase: f.phase, bodies: this.bossBodies(f.boss.key).filter((m) => !m.dead).map((m) => ({ id: m.id, x: m.x, z: m.z, yaw: m.yaw, hp: m.hp / m.maxHp, flying: !!m.flying, perch: !!m.flying && !!f.perch, breathing: !!m.breathing, spin: m.spin > 0, turning: f.turn?.m === m, ward: m.ward ?? 1 })), adds: this.adds().map((a) => ({ id: a.id, x: a.x, z: a.z })) } : null,
      hazards: this.sim.perils.marks.map(markOut),
    });
  }
}

export { terrainHeight };
