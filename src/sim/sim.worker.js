// The simulation thread. Runs the world at a fixed rate, independent of the display, and publishes
// complete snapshots for the render thread. Nothing in here waits on the GPU or the DOM.
import { FIELD_CREATURES } from '../core/field-creatures.js';
import { mapFolk } from '../folk/layout.js';
import { FieldCreature } from './field-creature.js';
import { setOpeningTerrain } from '../core/terrain.js';
import { CAVE_LINE, CAVE_MOUTH, CAVE_OUT, OPENING, OPENING_REVISION, OPENING_YAW, clutterBoxes } from '../core/opening.js';
import { Opening } from './opening.js';
import { LISANDRA_FORMS } from '../core/lisandra.js';
import { VillageWalker } from './village-walker.js';
import { parseGLB } from '../core/glb.js';
import { CHARS_START, CTRL, C_SIZE, EV, EV_CAPACITY, EV_FLOATS, H, INPUT, PLAN_FLOATS, PLAN_OBS, PLAN_TACTICS, SNAP_FLOATS, TOTAL_BYTES, mapShared } from '../core/layout.js';
import { ArmsRig, ClipBank, Rig } from './anim.js';
import { Casting } from './casting.js';
import { CRAB_SCALE, Crab } from './crab.js';
import { GRAVEHART_SCALE, Gravehart } from './gravehart.js';
import { HYDRA_SCALE, Hydra } from './hydra.js';
import { floorAt, inPit } from '../core/interior.js';
import { FOE, stepFoeWorks } from './foespells.js';
import { addUndead, corpsesNear, raiseZombie, resetCatacombs, stepCatacombs, stepGraves, stepWoods, Zombie } from './undead.js';
import { POOL } from '../core/lands.js';
import { CHURCH_GUARD, churchAt } from '../core/church.js';
import { inTown } from '../core/town.js';
import { ATTACKS, Knight, S } from './knight.js';
import { TOWN_KNIGHTS } from '../core/knights.js';
import { Player } from './player.js';
import { MAX_MANA } from './spells.js';
import { World } from './world.js';
import { Hero, HeroWorld, mobKind } from './hero.js';
import { MOB_KEYS, TRIG } from '../core/heroes.js';
import { Slimes } from './slimes.js';
import { Tumblers } from './tumblers.js';
import { TripoEmpty, TripoWorld } from './tripo.js';
import { Warrens } from './dungeon.js';
import { PORTAL, inDungeon } from '../core/dungeon.js';
import { inHall } from '../core/testhall.js';
import { TestHall } from './testhall.js';
import { TRIPO_BASE, TRIPO_SLOTS, withVariants } from '../core/tripo-monsters.js';

// (shieldHit: how large a blade finds the shield. The swords and shields themselves are in Renderer.init: V for the black knight, T for the silver.)
// Velscour's knight, who keeps the church. He'll fight you if you come near, and when he's down the world goes on. He won't follow you
// into the town (keep: Knight.letGo).
const BLACK = {
  spawn: [...CHURCH_GUARD], yaw: -Math.PI / 2, hostile: true, hp: 520, walk: 1.5, swordScale: 1.085, shieldScale: 1.6, shieldHit: 1.3, bladeLen: 1,
  route: [[...CHURCH_GUARD]], pauseClip: null, keep: true,   // On guard before the cathedral's great door, and no further.
  // He may follow you off his ground, but only so far: past leash metres from his door he lets you go and walks back to it,
  // and he lets you go at once when you're back in town (keep: Knight.letGo).
  style: 'black', leash: 20,
};
const SILVER = {
  spawn: [-2, 13], yaw: 2.6, hostile: false, hp: 420, walk: 1.35, swordScale: 0.96, shieldScale: 1.25, shieldHit: 1.2, bladeLen: 1,
  route: [[-7, 13], [-7, 19], [0, 19], [0, 13]], pauseClip: 'Idle_FoldArms_Loop', style: 'silver',
};

// Keeps to the woods north of the village. hp is how long it fights; territory is how far from spawn it minds you.
// (Back in the trees, west of the Fen Way: it used to lie up right beside the road.)
const GRAVEHART = { spawn: [-40, -150], lair: [-62, -168], yaw: 0.4, hp: 380, territory: 30 };
// Lies up in the south, and doesn't go looking for anyone.
// Down in the rift under the catacombs, on its burning floor, east of the bridge and the scaffold stair: see gulf() in tools/interior/build_interior.py. pit: where it can go.
// (All in the church's own frame, and moved with it: src/core/church.js.)
const PIT = [churchAt(150, -133), churchAt(222, -123)];
const HYDRA = { spawn: churchAt(208, -128), lair: churchAt(217, -127), yaw: -1.57, hp: 900, territory: 24, pit: { y: -44.25, x0: PIT[0][0], x1: PIT[1][0], z0: PIT[0][1], z1: PIT[1][1] } };

// The great crabs keep the shore of the pool under Brightwater Falls (src/core/lands.js), north and south of it, clear of the seal
// on its west bank. (They used to come up out of the fields round the town after the first blood: that's gone.)
const CRABS = [
  { spawn: [POOL.x - 12, POOL.z - 38], yaw: 1.0, hp: 55, flank: 1.1 },
  { spawn: [POOL.x + 6, POOL.z - 37], yaw: -0.9, hp: 55, flank: -1.2 },
  { spawn: [POOL.x - 4, POOL.z + 38], yaw: -2.0, hp: 55, flank: 0.3 },
];

// How much faster than their clips each kind goes, by kind: knight, silver knight, crab, Gravehart, Hydra, undead, ogre.
// (Eased when the swords went: they have to cross open ground under fire, and a wizard has no parry.)
const HASTE = [1.1, 0.95, 1.1, 1, 1, 1.05, 1], CASTER_HASTE = 1.1;
// Sim.poseGap's distances (metres from the player) and gaps (seconds): within close, every tick whatever; drawn, every tick within
// near, then midGap to mid, then farGap; not drawn, hidden.
const POSE_GAP = { close: 16, near: 45, mid: 90, midGap: 1 / 70, farGap: 1 / 40, hidden: 1 / 8 };
const POSE_GAP_LEAN = { close: 12, near: 25, mid: 50, midGap: 1 / 30, farGap: 1 / 20, hidden: 1 / 5 };

class Sim {
  constructor() {
    this.packAt = 0; this.healSeen = 0; this.manaSeen = 0;
    this.time = 0; this.tick = 0; this.timeScale = 1; this.stopT = 0; this.slowT = 0; this.gameState = 0; this.gameT = 0;
    this.knights = [];
    // The slimes out in the wet places; the spells look for them with the knights, as sim.foes.
    this.slimes = new Slimes();
    // And the living stones in the countries (src/sim/tumblers.js).
    this.tumblers = new Tumblers();
    this.villagers = [];
    // The other Tessariels (src/sim/hero.js): not knights, so nothing of the player's touches them. Drawn between the knights and the villagers.
    this.heroes = [];
    this.mobIndex = (k) => MOB_KEYS.indexOf(mobKind(k));     // (What a spell hit, for the heroes' words: casting.js.)
    this.nudgePosition = new Float32Array(3);
    this.scratch = new Float32Array(SNAP_FLOATS);
    this.snapU = new Uint32Array(this.scratch.buffer);
    this.tacticWeights = new Float32Array(PLAN_TACTICS).fill(1);
    this.rollouts = 0;
    this.pendingEvents = [];
    this.foeWorks = []; this.foeBigAt = 0;
    this.raise = (x, z, owner, calm) => raiseZombie(this, x, z, owner, calm);
    this.corpses = (k, r) => corpsesNear(this, k, r);
  }

  charOffset(i) { return CHARS_START + i * C_SIZE; }

  // Whatever a spell can hit: the knights and the dead, and the slimes (src/sim/slimes.js). Made once a tick.
  get foes() {
    if (this.foesTick !== this.tick) { this.foesTick = this.tick; this.foesList = this.slimes.list.length || this.tumblers.list.length ? this.knights.concat(this.slimes.list, this.tumblers.list) : this.knights; }
    return this.foesList;
  }

  event(type, a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0) {
    if (this.shared) {
      const head = Atomics.load(this.shared.ctrl, CTRL.EV_HEAD);
      const o = (head % EV_CAPACITY) * EV_FLOATS;
      const ev = this.shared.events;
      ev[o] = type; ev[o + 1] = a; ev[o + 2] = b; ev[o + 3] = c; ev[o + 4] = d; ev[o + 5] = e; ev[o + 6] = f; ev[o + 7] = g;
      Atomics.store(this.shared.ctrl, CTRL.EV_HEAD, head + 1);
    } else {
      this.pendingEvents.push(type, a, b, c, d, e, f, g);
    }
  }

  // Seconds between full poses for a body (k, in character slot `slot`). Every tick near the player, or on screen near enough to be
  // looked at; less often on screen far off; seldom when it isn't drawn at all (INPUT.SEEN, from the renderer). Between them the
  // last pose is carried along with the body (src/core/carry.js), so it glides; only the limbs of something far off are a beat
  // behind. Posing is over half of a tick's work. A phone poses less.
  poseGap(k, slot) {
    const p = this.player, d = Math.hypot(k.x - p.x, k.z - p.z), g = this.lean ? POSE_GAP_LEAN : POSE_GAP;
    if (d < g.close || !(slot >= 0)) return 0;
    if (!(this.input[INPUT.SEEN + slot] > 0.5)) return g.hidden;
    return d < g.near ? 0 : d < g.mid ? g.midGap : g.farGap;
  }

  hitStop(t) { this.stopT = Math.max(this.stopT, t); }

  slowMo(t) { this.slowT = Math.max(this.slowT, t); }

  restart() {
    // (Fallen in the Hollowfang Warrens: back at its way in, not out on the road. src/sim/dungeon.js afterRestart.)
    const inWarrens = !!this.player && inDungeon(this.player.x, this.player.z) && this.tick > 0;
    // (In the Test Dungeon, what it brought into its arena goes home first: src/sim/testhall.js.)
    this.testHall?.beforeRestart();
    this.wantRestart = false;
    this.player.reset();
    this.player.y = this.world.height(this.player.x, this.player.z);
    this.casting.reset();
    this.knights.forEach((k, i) => k.reset(k.opts));
    this.tripo?.reset();
    this.villagers.forEach((v) => v.reset());
    if (this.heroWorld) this.heroWorld.killed = [];
    this.opening?.reset();
    this.foeWorks = []; this.foeBigAt = 0;
    this.gameState = 0; this.gameT = 0; this.time = 0; this.stopT = 0; this.timeScale = 1;
    this.wardenWanted = false; this.groanAt = -9;
    resetCatacombs();
    this.reachedTown = false; this.packAt = 0; this.packN = 0; this.wave = null; this.lastMeleeAt = -9; this.graveAt = 0; this.heartSeen = false; this.hydraSeen = false; this.slowT = 0; this.frozen = false; this.slow = 1;
    // Clicks made before the restart are spent.
    const p = this.player, inp = this.input;
    p.atkSeen = inp[INPUT.ATTACK]; p.wideSeen = inp[INPUT.WIDE]; p.jumpSeen = inp[INPUT.JUMP]; p.dodgeSeen = inp[INPUT.DODGE];
    const yaw = this.opening ? OPENING_YAW : Math.PI;
    this.input[INPUT.YAW] = yaw;
    this.input[INPUT.PITCH] = 0;
    self.postMessage({ type: 'restart', yaw });
    this.warrens?.afterRestart(inWarrens);
    // (And in the Test Dungeon you're stood back at its hall's south end.)
    this.testHall?.afterRestart();
  }

  step(dt) {
    const { input, player } = this;
    if (input[INPUT.DOORS] !== this.doorsSeen) { this.doorsSeen = input[INPUT.DOORS]; this.world.setDoors(this.doorsSeen); }
    // (The first tick runs even paused, so there's a world to draw under the title.)
    if (input[INPUT.PAUSE] > 0.5 && this.tick > 0) { if (this.shared) this.shared.plan[9] = 0; return; }
    this.touchAssist = input[INPUT.TOUCH] > 0.5;
    if (this.manual) {
      if (input[INPUT.CMD] !== this.cmdSeen) { this.cmdSeen = input[INPUT.CMD]; this.command(input[INPUT.ASPECT], input[INPUT.CMD_A], input[INPUT.CMD_B], input[INPUT.CMD_C]); }
      if (this.manualTicks <= 0) return;
      this.manualTicks--;
    }
    if (input[INPUT.RESTART] !== this.restartSeen) { this.restartSeen = input[INPUT.RESTART]; this.restart(); }
    // (Fallen in the Test Dungeon: started over by itself, a moment after. src/sim/testhall.js.)
    if (this.wantRestart) this.restart();
    if (input[INPUT.CMD] !== this.cmdSeen) { this.cmdSeen = input[INPUT.CMD]; this.command(input[INPUT.ASPECT], input[INPUT.CMD_A], input[INPUT.CMD_B], input[INPUT.CMD_C]); }
    if (this.stopT > 0) { this.stopT -= dt; this.timeScale = 0.08; } else this.timeScale = Math.min(1, this.timeScale + dt * 14);
    if (this.slowT > 0) this.slowT -= dt;
    const tdt = dt * this.timeScale * (this.slow || 1) * (this.slowT > 0 ? 0.25 : 1);
    this.time += tdt;
    this.tick++;
    this.gameT += dt;
    this.casting.power = input[INPUT.POWER] || 1; this.casting.maxMana = MAX_MANA + input[INPUT.MANA_MAX]; this.casting.regen = input[INPUT.REGEN] || 1; this.casting.thrift = input[INPUT.THRIFT];
    if (input[INPUT.HEAL] !== this.healSeen) { const g = input[INPUT.HEAL] - this.healSeen; this.healSeen = input[INPUT.HEAL]; if (g > 0 && !player.dead) player.hp = Math.min(player.maxHp, player.hp + g); }
    if (input[INPUT.MANA_UP] !== this.manaSeen) { const g = input[INPUT.MANA_UP] - this.manaSeen; this.manaSeen = input[INPUT.MANA_UP]; if (g > 0) this.casting.mana = Math.min(this.casting.maxMana, this.casting.mana + g); }
    if (!this.opening?.frozen()) player.update(dt * (this.slow || 1), tdt, input, this);
    for (let i = 0; i < this.heroes.length; i++) this.heroes[i].lodSlot = this.knights.length + i;
    for (let i = 0; i < this.knights.length; i++) {
      const k = this.knights[i], ox = k.x, oz = k.z;
      k.lodSlot = i;
      k.update(this.frozen ? 0 : tdt * this.casting.rate(k) * (k.opts?.role ? CASTER_HASTE : HASTE[k.kind] ?? 1), this);
      // Velscour's church is the undead's. What lives in the fields stops at its door.
      // (The Hydra is the exception. The pit is where it lives.)
      if (k.opts?.pit ? false : k instanceof Zombie ? inPit(k.x, k.z) : floorAt(k.x, k.z) !== null) { k.x = ox; k.z = oz; }
      // The ghost shield's shove: thrown back, dying off fast, and stopped by what's solid.
      if (k.pushX || k.pushZ) {
        if (!this.nudgeBody(k, k.pushX * tdt, k.pushZ * tdt, 0.4)) k.pushX = k.pushZ = 0;
        const fall = Math.exp(-4.5 * tdt);
        k.pushX *= fall; k.pushZ *= fall;
        if (Math.abs(k.pushX) + Math.abs(k.pushZ) < 0.4) { k.pushX = 0; k.pushZ = 0; }
      }
      // And the town is safe ground: nothing that hunts you comes in. (The silver knight lives there, and a knight on a post, on a
      // leash from it, may cross its edge.) src/core/town.js.
      if (k.kind !== 1 && !k.opts?.leash && inTown(k.x, k.z) && !inTown(ox, oz)) { k.x = ox; k.z = oz; }
      if (k.champion && !k.dead && this.tick % 10 === 0) this.event(EV.CHAMPION, k.x, k.y + 1.3, k.z);
      // Each death leaves its loot once.
      // (What one of the other Tessariels kills is theirs: src/sim/hero.js.)
      // (And one that bled out or fell apart after a hero's blow, with no hand of the player's in it, is theirs too.)
      // (A summoner's dead fall with it: theirs whose kill the summoner was.)
      if (k.dead && !k.looted && !k.heroKill) {
        const mine = this.time - (k.playerHitT ?? -1e9) < 30 || (k.owner && this.time - (k.owner.playerHitT ?? -1e9) < 30);
        // (Your party's blows are yours.)
        const theirs = k.heroFoe && !k.heroFoe.hired && this.time - (k.heroFoeT ?? -1e9) < 30;
        if (!mine && theirs) { k.heroKill = true; this.heroWorld?.onKill(k.heroFoe, k); }
        else if (!mine && k.owner?.heroKill) k.heroKill = true;
      }
      if (k.dead && !k.looted && k.heroKill) k.looted = true;
      // You took one a hero was fighting: a kill stolen, or a life saved.
      if (k.dead && !k.looted && k.heroFoe && !k.heroFoe.dead && !k.heroFoe.hired && this.time - (k.heroFoeT ?? -1e9) < 6) {
        const h = k.heroFoe;
        this.event(EV.HERO, h.slot, TRIG[h.hp < h.maxHp * 0.35 ? 'saved_by_player' : 'player_steals_kill'], -1, -1, MOB_KEYS.indexOf(mobKind(k)), 0, 0);
      }
      // (d: what it drops, by drops.js; e: 1 + what it is, by KIND, for the heroes' talk.)
      if (k.dead && !k.looted) { k.looted = true; this.casting.mana = Math.min(this.casting.maxMana, this.casting.mana + 6); this.event(EV.LOOT, k.x, k.opts?.pit ? k.y : this.world.height(k.x, k.z), k.z, k.champion ? 8 : k.opts?.lootKind ?? k.kind, 1 + k.kind); }
      if (!k.dead) k.looted = false;
    }
    if (this.opening) this.opening.update(tdt);
    else for (const v of this.villagers) v.update(this.frozen ? 0 : tdt, this.world);
    if (this.heroWorld && !this.frozen && tdt > 0) this.heroWorld.step(tdt);
    if (!this.frozen && tdt > 0) this.warrens?.step(tdt);
    // (In real seconds: its door and its count after a fall don't slow with a slow-motion death.)
    this.testHall?.step(dt);
    this.separate();
    this.casting.update(dt * (this.slow || 1), tdt, input, this);
    // (After the spells' update, which clears the frame's shapes.)
    this.heroWorld?.drawFx();
    this.warrens?.drawFx();
    if (!this.opening || this.opening.stage === OPENING.ARRIVED) this.slimes.step(this.frozen ? 0 : tdt, this);
    if (!this.opening || this.opening.stage === OPENING.ARRIVED) this.tumblers.step(this.frozen ? 0 : tdt, this);
    stepFoeWorks(tdt, this);
    stepCatacombs(this);
    if (!this.opening || this.opening.stage === OPENING.ARRIVED) { stepWoods(this); stepGraves(this); }
    this.tripo?.step();
    const snap = this.scratch;
    player.write(snap, this);
    this.casting.write(snap);
    this.slimes.write(snap);
    this.tumblers.write(snap);
    this.knights.forEach((k, i) => k.write(snap, this.charOffset(i), this));
    const nk = this.knights.length, nh = this.heroes.length;
    this.heroes.forEach((h, i) => h.write(snap, this.charOffset(nk + i), this));
    this.villagers.forEach((v, i) => { v.mouth = input[INPUT.MOUTH]; v.write(snap, this.charOffset(nk + nh + i)); });
    if (this.opening) this.opening.write(snap, H);
    else snap[H.OPENING] = OPENING.OFF;
    player.sweep(snap, this);
    this.knights.forEach((k, i) => k.writeGashes(snap, this.charOffset(i), this));
    this.plan();
    snap[H.TIME] = this.time; snap[H.TICK] = this.tick;
    snap[H.NCHARS] = this.knights.length + this.heroes.length + this.villagers.length;
    snap[H.GAME] = this.gameState; snap[H.GAME_T] = this.gameT;
    snap[H.TIME_SCALE] = this.timeScale * (this.slowT > 0 ? 0.25 : 1);
    snap[H.TACTIC] = this.knights[0].tactic;
    snap[H.ROLLOUTS] = this.rollouts;
    snap[H.PARRIED] = this.knights[0].stats.parried || 0;
  }

  // Combat shoves and separation happen after movement, so they need their own collision check.
  nudgeBody(body, dx, dz, radius) {
    const x = body.x + dx, z = body.z + dz;
    if (body !== this.player) {
      const pit = body.opts?.pit;
      if (pit && (x < pit.x0 || x > pit.x1 || z < pit.z0 || z > pit.z1)) return false;
      if (!pit && (body instanceof Zombie ? inPit(x, z) : floorAt(x, z) !== null)) return false;
      if (body.kind !== 1 && !body.opts?.leash && inTown(x, z) && !inTown(body.x, body.z)) return false;
    }
    const pos = this.nudgePosition;
    pos[0] = x; pos[2] = z;
    if (this.world.resolve(pos, radius, body.y + 0.2)) return false;
    body.x = x; body.z = z;
    // (A hero shouldered aside takes the steps: src/sim/hero.js turns this into a walk on the spot.)
    if (body.opts?.hero) body.nudged = (body.nudged || 0) + Math.hypot(dx, dz);
    if (body === this.player) body.keepToLand();
    return true;
  }

  // Bodies don't pass through each other: plate armour shoulders the player aside, and knights too.
  separate() {
    const p = this.player;
    // (Not her while you wake in the cave: you can't move, and she has to come close enough to pass a palm across your eyes.)
    const her = !this.opening ? this.villagers : this.opening.stage === OPENING.WAKE ? [] : this.villagers.slice(1);
    // (One list, kept between ticks, of the bodies that are up and about: the dead and the dormant are never pushed.)
    const list = this.sepList || (this.sepList = []);
    list.length = 0;
    for (const k of this.knights) if (!k.dead && !k.dormant) list.push(k);
    for (const h of this.heroes) if (h.active && !h.surf && !h.jump && !h.dead) list.push(h);
    for (let i = this.opening && this.opening.stage !== OPENING.WAKE ? 1 : 0; i < (this.opening?.stage === OPENING.WAKE ? 0 : this.villagers.length); i++) if (!this.villagers[i].dead && !this.villagers[i].dormant) list.push(this.villagers[i]);
    void her;
    for (const k of list) {
      const P = k.bodyRadius || 0.82;
      const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz);
      if (d < P && d > 1e-3 && !k.iframes && Math.abs(p.y - k.y) < 4) {
        const push = (P - d) / d;
        this.nudgeBody(p, dx * push * 0.8, dz * push * 0.8, 0.36);
        this.nudgeBody(k, -dx * push * 0.2, -dz * push * 0.2, 0.4);
      }
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        // Two knights keep a body between them, so blades and boards don't pass through shoulders.
        const R = a instanceof Knight && b instanceof Knight ? 1.3 : (a.bodyRadius || 0.5) * 0.7 + (b.bodyRadius || 0.5) * 0.7;
        const dx = b.x - a.x, dz = b.z - a.z;
        if (dx * dx + dz * dz >= R * R) continue;
        const d = Math.hypot(dx, dz);
        if (d < R && d > 1e-3 && Math.abs(a.y - b.y) < 4) {
          const push = (R - d) / d * 0.5;
          this.nudgeBody(b, dx * push, dz * push, 0.4);
          this.nudgeBody(a, -dx * push, -dz * push, 0.4);
        }
      }
    }
  }

  // Tell the planner threads what the duel looks like, and take in what they've worked out.
  plan() {
    if (!this.shared || this.tick % 12) return;
    const k = this.knights[0], p = this.player, pl = this.shared.plan;
    pl[0] = Math.hypot(k.x - p.x, k.z - p.z);
    pl[1] = k.hp / k.maxHp; pl[2] = p.hp / p.maxHp; pl[3] = k.stam / 100; pl[4] = k.bleeds.length;
    pl[5] = p.aggression;
    pl[6] = p.swingCount ? p.whiffCount / p.swingCount : 0.5;
    pl[7] = k.habit.repeat; pl[8] = k.armor;
    // The planners sleep unless there's a fight on.
    pl[9] = k.state === S.PATROL || k.dead || this.gameState !== 0 ? 0 : 1;
    const st = k.stats;
    pl[10] = st.attacks > 2 ? st.landed / st.attacks : 0.4;
    pl[11] = p.swingCount > 2 ? Math.min(1, p.hits / p.swingCount) : 0.5;
    pl[12] = p.swingCount > 2 ? Math.min(1, (st.blocks + st.rolls) / p.swingCount) : 0.4;
    Atomics.add(this.shared.ctrl, CTRL.PLAN_SEQ, 1);
    if (this.tick % 60 === 0) {
      let best = -1e9, total = 0;
      const scores = [];
      for (let i = 0; i < PLAN_TACTICS; i++) {
        const sum = pl[PLAN_OBS + i * 2], n = pl[PLAN_OBS + i * 2 + 1];
        const s = n > 0 ? sum / n : 0;
        scores.push(s); total += n;
        if (s > best) best = s;
      }
      this.rollouts = pl[PLAN_FLOATS - 1];
      if (total > 10) {
        for (let i = 0; i < PLAN_TACTICS; i++) this.tacticWeights[i] = Math.exp((scores[i] - best) * 1.5) + 0.12;
      }
    }
  }

  // Debug and review commands, so a scene can be staged for the critics' screenshots.
  command(code, a, b, c) {
    const p = this.player, k = this.knights[a | 0] || this.knights[0];
    switch (code | 0) {
      case 1: // stand the player b metres in front of a knight, looking at them
        k.plateTransforms(this.scratch, this.charOffset(a | 0), this.tick);
        p.x = k.x + Math.sin(k.yaw) * b; p.z = k.z + Math.cos(k.yaw) * b;
        p.y = this.world.height(p.x, p.z);
        self.postMessage({ type: 'look', yaw: Math.atan2(k.x - p.x, k.z - p.z), pitch: 0 });
        break;
      case 2: this.frozen = !this.frozen; break;
      case 3: { // a gash across the chest and, with b, a puncture through it
        k.plateTransforms(this.scratch, this.charOffset(a | 0), this.tick);
        const piece = k.rig.pieces.findIndex((pc) => pc.kind === 'plate' && pc.joints.some(([j]) => k.rig.names[j] === 'spine_03'));
        const pc = k.rig.pieces[piece];
        const cy = (pc.min[1] + pc.max[1]) / 2, zf = pc.max[2];
        const g = k.addGash(this, piece, -0.12, cy + 0.09, zf, 0.1, 0.1, 0.98, 0, -1, 0);
        g.b = [0.12, cy - 0.08, zf];
        if (b) { g.tOn = 0.5; k.puncture(this, g, 0, cy, zf, 0, 0, 1); }
        k.gashVersion++;
        break;
      }
      case 4: k.hostile = true; k.setState(S.CIRCLE); k.combatTarget = 1; break;
      case 5: k.startRoll(this, p, false); break;
      case 6: k.startAttack(this, Object.values(ATTACKS)[b | 0]); break;
      case 7: k.x = b; k.z = c; k.y = this.world.height(k.x, k.z); break;
      case 19: p.x = b; p.z = c; p.y = this.world.height(p.x, p.z); break;
      case 8: p.hp = p.maxHp; break;
      case 9: k.hp = 1; break;
      case 16: if (k.cutNeck) k.cutNeck(this, ['l', 'm', 'r'][b | 0], c ? 'up' : 'head'); break;
      case 18: if (k.force) k.force(this, b | 0); break;
      case 22: if (k.sever) k.sever(this, b | 0); break;   // (Was 19, which the stand-the-player command above already takes.)
      case 20: if (k.startCast) { k.goal = 1; k.aggro = true; k.hostile = true; k.startCast(this, Object.keys(FOE)[b | 0]); } break;
      case 10: k.hostile = true; k.combat = 1; k.combatTarget = 1; k.shieldUp = 1; k.shieldTarget = 1; k.pauseT = 0; break;
      case 11: this.restart(); break;
      // The tumblers, for review: 40 fills the camp nearest (b, c) now; 41 wakes them all.
      case 40: this.tumblers.debugFill(b, c, this); break;
      case 41: for (const t of this.tumblers.list) t.wake(this); break;
      case 42: this.tumblers.debugSpawn(Math.floor(a / 10), a % 10, b, c, this); break;
      case 13: this.slow = b; break;
      case 17: p.damage(this, 1000, p.x + 1, p.z, 0); break;
      case 14: this.manual = true; this.manualTicks = b; break;
      case 15: this.manual = false; break;
      case 12: this.knights.forEach((n) => { if (n.wakeAt !== undefined) n.wakeAt = 0; }); break;
      case 24: this.tripo?.standHere(a | 0, b, c); break;   // a Tripo monster (its place in roster.json) stood at b, c, facing you, for tests and reviews
      case 25: if (this.tripo) this.tripo.testPal = this.tripo.palNames[a | 0]; break;   // and the palette those wear (palettes.json, by place)
      case 23: console.log('[k] ' + JSON.stringify(this.knights.slice(0, 2).map((n) => ({ ...n.stats, hp: Math.round(n.hp), moves: n.recent })))); break;   // what the knights have been doing, for review logs
      case 21: { // hold a knight still in clip b (by its place in the bank) at c seconds, for review sheets
        const name = Object.keys(k.bank.clips)[b | 0];
        k.hostile = false; k.target = null; k.state = S.IDLE; k.pauseT = 1e9; k.combat = k.combatTarget = 1; k.shieldUp = k.shieldTarget = 0;
        k.play(name, 0, 'full', 0.0001); k.actT = c; k.fromW = 0;
        // As a blow, so the shield arm's hold and the turn into it show as they do in a fight.
        k.reviewAttack = Object.values(ATTACKS).find((x) => x.clip === name) || null;
        if (k.reviewAttack?.hold) k.shieldUp = k.shieldTarget = 1;
        break;
      }
      default: break;
    }
  }

  // paced: the frames' time (CTRL.PACE_US) the world has reached, when the screen is pacing it (boot's loop).
  publish(paced = 0) {
    if (this.shared) {
      const { ctrl, snaps } = this.shared;
      const latest = Atomics.load(ctrl, CTRL.LATEST), reading = Atomics.load(ctrl, CTRL.READING);
      let slot = 0;
      while (slot === latest || slot === reading) slot++;
      snaps[slot].set(this.scratch);
      Atomics.store(ctrl, CTRL.SNAP_US + slot, paced);
      Atomics.store(ctrl, CTRL.PUB_MS, (performance.timeOrigin + performance.now()) % 2147483647);
      Atomics.store(ctrl, CTRL.LATEST, slot);
      Atomics.add(ctrl, CTRL.TICK, 1);
    } else {
      const copy = this.scratch.slice();
      const ev = this.pendingEvents.length ? new Float32Array(this.pendingEvents) : null;
      this.pendingEvents.length = 0;
      self.postMessage({ type: 'snap', snap: copy, events: ev }, ev ? [copy.buffer, ev.buffer] : [copy.buffer]);
    }
  }
}

// ---- saved games -------------------------------------------------------------------------------------------------
// A loaded game starts the world fresh and puts the player where the save says (src/saves.js has what a save holds).
Sim.prototype.place = function (d) {
  this.restart();
  if (!d || (this.opening && d.openingRevision !== OPENING_REVISION)) return;
  // (A game kept down in the Warrens loads at their portal, out in the woods: the Warrens start again from nothing.)
  if (inDungeon(d.x, d.z)) d = { ...d, x: PORTAL.x + Math.sin(PORTAL.yaw) * 4, z: PORTAL.z + Math.cos(PORTAL.yaw) * 4, y: -1e9, yaw: PORTAL.yaw };
  // (Nobody's kept in the Test Dungeon's hall but while it's on: src/sim/testhall.js. Anywhere else, the road into town.)
  if (inHall(d.x, d.z) && !this.testHall?.on) d = { ...d, x: 7.5, z: 72, y: -1e9, yaw: Math.PI };
  const p = this.player;
  const floor = this.world.heightFor(d.x, d.z, d.y);
  p.x = d.x; p.z = d.z; p.y = Math.max(d.y, floor);
  p.onGround = p.y <= floor + 0.06;
  p.vx = 0; p.vy = 0; p.vz = 0; p.yaw = d.yaw;
  if (this.opening && d.opening) this.opening.restore(d);
  this.input[INPUT.YAW] = d.yaw; this.input[INPUT.PITCH] = d.pitch;
  self.postMessage({ type: 'look', yaw: d.yaw, pitch: d.pitch });
};

async function fetchBuf(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.arrayBuffer();
}

async function boot(msg) {
  const sim = new Sim();
  sim.lean = !!msg.lean;
  const base = msg.base;
  setOpeningTerrain(msg.opening);
  if (msg.buffer) {
    sim.shared = mapShared(msg.buffer);
    sim.input = sim.shared.input;
  } else {
    sim.input = new Float32Array(INPUT.SIZE);
    self.addEventListener('message', (e) => { if (e.data.input) sim.input.set(e.data.input); });
  }
  sim.input[INPUT.YAW] = Math.PI;
  const [clipsMeta, clipsBin, black, silver, arms2h, arms1h, village, crabBuf, heartBuf, hydraBuf, spellAttack, spellRaise, armsStaff] = await Promise.all([
    fetch(`${base}assets/game/clips.json`).then((r) => r.json()),
    fetchBuf(`${base}assets/game/clips.bin`),
    fetchBuf(`${base}assets/game/velscour_knight.glb`),
    fetchBuf(`${base}assets/game/silver_knight.glb`),
    fetchBuf(`${base}assets/fp/arms_2h.glb`),
    fetchBuf(`${base}assets/fp/arms_1h.glb`),
    fetch(`${base}assets/game/village.json`).then((r) => r.json()),
    fetchBuf(`${base}assets/monsters/crab_monster/crab_monster.glb`),
    fetchBuf(`${base}assets/monsters/gravehart/gravehart.glb`),
    fetchBuf(`${base}assets/monsters/bone_hydra/bone_hydra.glb`),
    fetchBuf(`${base}assets/fp/spell_attack.glb`),
    fetchBuf(`${base}assets/fp/spell_raise.glb`),
    fetchBuf(`${base}assets/fp/arms_staff.glb`),
  ]);
  if (msg.opening) {
    // Lisandra's cave (src/core/opening.js): her clutter, the rock either side of its mouth, and the rubble that fills the
    // mouth when it falls in (out of the way until then: src/sim/world.js setCaveSealed).
    const w = CAVE_LINE[0][6], yaw = Math.atan2(CAVE_OUT[0], CAVE_OUT[1]), side = [CAVE_OUT[1], -CAVE_OUT[0]];
    const at = (q, o) => [CAVE_MOUTH[0] + side[0] * q + CAVE_OUT[0] * o, CAVE_MOUTH[1] + side[1] * q + CAVE_OUT[1] * o];
    const box = ([x, z], hx, hz, h, more) => ({ x, z, hx, hz, yaw, h, ...more });
    village.colliders.push(...clutterBoxes(), box(at(w + 1.4, 0), 1.2, 1.2, 6), box(at(-w - 1.4, 0), 1.2, 1.2, 6),
      box(at(0, -0.5), w + 0.8, 1.4, 3.5, { rubble: true }));
  }
  const bank = new ClipBank(clipsMeta, clipsBin);
  sim.world = new World(village, await fetch(`${base}assets/game/interior/interior.json`).then((r) => r.json()));
  sim.player = new Player({ 1: new ArmsRig(arms1h), 2: new ArmsRig(arms2h), 3: new ArmsRig(armsStaff) });
  sim.player.y = sim.world.height(sim.player.x, sim.player.z);
  sim.casting = new Casting({ attack: new ArmsRig(spellAttack), raise: new ArmsRig(spellRaise) });
  sim.knights.push(new Knight(0, 0, new Rig(parseGLB(black), bank), bank, BLACK));
  sim.knights.push(new Knight(1, 1, new Rig(parseGLB(silver), bank), bank, SILVER));
  const crabRig = new ArmsRig(crabBuf, CRAB_SCALE);
  CRABS.forEach((c, i) => sim.knights.push(new Crab(2 + i, 2, crabRig, c)));
  sim.knights.push(new Gravehart(5, 3, new ArmsRig(heartBuf, GRAVEHART_SCALE), GRAVEHART));
  sim.knights.push(new Hydra(6, 4, new ArmsRig(hydraBuf, HYDRA_SCALE), HYDRA));
  await addUndead(sim, base);
  for (const creature of FIELD_CREATURES) {
    const buffer = await fetchBuf(base + 'assets/monsters/new_creatures/' + creature.model + '.glb');
    const rig = new ArmsRig(buffer, creature.scale, new Set(['idle', 'walk', 'run', 'attack', 'death']));
    const hips = rig.index.get('mixamorig:Hips');
    for (const clip of Object.values(rig.clips)) {
      const track = clip.trs[hips];
      if (!track) { clip.speed = 1; continue; }
      const x = track[0], z = track[2];
      const dx = track[track.length - 3] - x, dz = track[track.length - 1] - z;
      clip.speed = Math.max(0.5, Math.hypot(dx, dz) / clip.dur);
      for (let frame = 0; frame < clip.frames; frame++) {
        const fraction = frame / (clip.frames - 1);
        track[frame * 3] -= dx * fraction;
        track[frame * 3 + 2] -= dz * fraction;
      }
      clip.loop = ['idle', 'walk', 'run'].includes(clip.name);
    }
    sim.knights.push(new FieldCreature(sim.knights.length, rig, creature));
  }
  // The knights in the other suits: Tessariel's walking the village, Velscour's man on the west road.
  const townBufs = await Promise.all(TOWN_KNIGHTS.map((t) => fetchBuf(base + t.asset)));
  TOWN_KNIGHTS.forEach((t, i) => sim.knights.push(new Knight(sim.knights.length, t.kind, new Rig(parseGLB(townBufs[i]), bank), bank, t)));
  // The Tripo monsters' slots, empty until you come near a lair (src/sim/tripo.js).
  const [tripoRoster, tripoPalettes] = await Promise.all(['roster.json', 'palettes.json'].map((f) => fetch(base + TRIPO_BASE + f).then((r) => r.json())));
  const firstTripo = sim.knights.length;
  for (let i = 0; i < TRIPO_SLOTS; i++) sim.knights.push(new TripoEmpty(sim.knights.length));
  sim.tripo = new TripoWorld(sim, base, withVariants(tripoRoster), tripoPalettes, firstTripo, TRIPO_SLOTS);
  // The other Tessariels: the render thread chose who's in the world this session (src/core/heroes.js makeCast).
  if (msg.heroes?.length) {
    const [hMeta, hBin, kit] = await Promise.all([
      fetch(`${base}assets/game/heroes/clips.json`).then((r) => r.json()),
      fetchBuf(`${base}assets/game/heroes/clips.bin`),
      fetch(`${base}assets/game/heroes/kit.json`).then((r) => r.json()),
    ]);
    const heroBank = new ClipBank(hMeta, hBin);
    const bufs = await Promise.all(msg.heroes.map((p) => fetchBuf(`${base}assets/game/heroes/${p.body}.glb`)));
    msg.heroes.forEach((person, i) => sim.heroes.push(new Hero(i, new Rig(parseGLB(bufs[i]), heroBank), heroBank, person, kit.props)));
    sim.heroWorld = new HeroWorld(sim, sim.heroes);
    if (msg.hour !== undefined) sim.heroWorld.setHour(msg.hour);
  }
  // The Hollowfang Warrens (src/sim/dungeon.js): after the Tripo lairs and the heroes, which it uses.
  sim.warrens = new Warrens(sim);
  // The Test Dungeon (src/sim/testhall.js): off until the main menu asks for it.
  sim.testHall = new TestHall(sim);
  for (const form of LISANDRA_FORMS) {
    sim.villagers.push(new VillageWalker(await fetchBuf(base + form.asset), form, msg.opening));
  }
  if (msg.opening) {
    sim.opening = new Opening(sim);
    sim.opening.reset();
    sim.input[INPUT.YAW] = OPENING_YAW;
    self.postMessage({ type: 'look', yaw: OPENING_YAW, pitch: 0 });
  }
  sim.restartSeen = sim.input[INPUT.RESTART];
  sim.cmdSeen = sim.input[INPUT.CMD];
  // Placing the player from a save, asked for by the render thread.
  self.addEventListener('message', (e) => {
    const m = e.data;
    if (m.type === 'openingName') sim.opening?.named();
    if (m.type === 'openingSkip') sim.opening?.skip();
    if (m.type === 'openingPose' && sim.opening) sim.opening.pose = m.b;
    // The other Tessariels: the town's clock, a gesture the words want, two or more held to talk, a review command.
    if (m.type === 'hour') sim.heroWorld?.setHour(m.hour);
    if (m.type === 'heroAct') sim.heroWorld?.act(m.slot, m.name, m.seconds);
    if (m.type === 'heroHold') sim.heroWorld?.holdFor(m.slots, m.seconds);
    if (m.type === 'heroWalk') sim.heroWorld?.walkFor(m.slot, m.seconds, m.mode);
    if (m.type === 'heroTalk') sim.heroWorld?.talkTo(m.slot, m.on);
    if (m.type === 'heroDebug') sim.heroWorld?.debug(m);
    // Your party, of the Free Company (src/ui/party.js): hired, let go, a level for each.
    if (m.type === 'hire') { const ok = sim.heroWorld?.hire(m.slot, m) || false; self.postMessage({ type: 'hired', slot: m.slot, ok, id: m.id }); }
    if (m.type === 'dismiss') sim.heroWorld?.dismiss(m.slot);
    if (m.type === 'hireLevel') { const h = sim.heroes[m.slot]; if (h?.hired) sim.heroWorld.setLevel(h, m.level); }
    if (m.type === 'warrensDebug') sim.warrens?.debug?.(m);
    if (m.type === 'hall') sim.testHall?.message(m);
    if (m.type === 'warden') { sim.wardenWanted = true; return; }
    if (m.type !== 'place') return;
    try { sim.place(m.data); self.postMessage({ type: 'placed', id: m.id }); } catch (err) {
      console.error(err);
      self.postMessage({ type: 'placed', id: m.id, error: err.message });
    }
  });
  self.postMessage({ type: 'ready', bytes: TOTAL_BYTES });

  // A tick, timed for the Frame rate readout (CTRL.STEP_US and the rest: GameView.simStats in src/main.js).
  // A bug in one tick is logged once and the world carries on, rather than the game freezing.
  const tickOf = (d) => {
    const t0 = performance.now();
    try { sim.step(d); } catch (err) {
      if (!sim.reported) { sim.reported = true; self.postMessage({ type: 'error', message: `${err.message}
${err.stack}` }); }
    }
    if (sim.shared) {
      const us = Math.round((performance.now() - t0) * 1000), c = sim.shared.ctrl;
      Atomics.add(c, CTRL.STEP_US, us); Atomics.add(c, CTRL.STEPS, 1);
      if (us > Atomics.load(c, CTRL.STEP_MAX)) Atomics.store(c, CTRL.STEP_MAX, us);
    }
  };

  // The world's own clock: a fixed step at hz. Without shared memory it's all there is (on timers); with it, it's what keeps the
  // world going when no frames are asking (below).
  const hz = msg.hz, dt = 1 / hz;
  let next = performance.now();
  let lastPublish = 0;
  const iterate = () => {
    const now = performance.now();
    let steps = 0;
    while (now >= next && steps < 6) { tickOf(dt); next += 1000 / hz; steps++; }
    if (now - next > 250) next = now;
    if (steps) {
      if (sim.shared || now - lastPublish > 7) { sim.publish(); lastPublish = now; }
    }
  };
  if (!msg.buffer) {
    const loop = () => { iterate(); setTimeout(loop, 2); };
    loop();
    return;
  }

  // Paced by the screen. Each frame the render thread asks for the time since its last one (GameView.pace in src/main.js), and the
  // world steps through exactly that and is published once: one tick at 144 Hz, two at 60, never longer than a tick at hz. So each
  // frame shows the world the same time on from the one before. (On its own clock it drifted against the screen's, and frames
  // showed no step, or two or three, unevenly: a judder in everything but the camera, at any frame rate.) A frame shorter than
  // SHORTEST isn't stepped for: its time goes with the next. With no frames coming (a hidden tab, a phone, which isn't paced, a
  // page with nothing drawn) it goes back to its own clock, and to the frames again when they come.
  const ctrl = sim.shared.ctrl;
  const TICK_MS = 1000 / hz, SHORTEST = 1000 / 170, FRAMELESS = 100, MOST = 100;
  let seq = Atomics.load(ctrl, CTRL.PACE_SEQ), done = Atomics.load(ctrl, CTRL.PACE_US), frameAt = -1e9;
  // (Waited for without blocking where the browser can, so messages, saves and loads, come in between ticks. Otherwise an exact
  // sleep, let go now and then for them.)
  const nap = Atomics.waitAsync
    ? (ms) => { const r = Atomics.waitAsync(ctrl, CTRL.PACE_SEQ, seq, ms); return r.async ? r.value : null; }
    : (ms) => { Atomics.wait(ctrl, CTRL.PACE_SEQ, seq, ms); return null; };
  let yielded = performance.now();
  for (;;) {
    const asked = Atomics.load(ctrl, CTRL.PACE_SEQ);
    if (asked !== seq) {
      seq = asked;
      const want = Atomics.load(ctrl, CTRL.PACE_US), now = performance.now();
      if (now - frameAt > FRAMELESS) {
        // (Back from its own clock, which has kept up: the frames' time runs from here.)
        done = want;
      } else {
        const owed = ((want - done) | 0) / 1000;
        if (owed >= SHORTEST) {
          // (A stall longer than MOST is let go, as the fixed step lets go of one.)
          const t = Math.min(owed, MOST), n = Math.max(1, Math.ceil(t / TICK_MS - 0.05));
          for (let i = 0; i < n; i++) tickOf(t / n / 1000);
          done = want;
          sim.publish(done);
        }
      }
      frameAt = now;
      next = performance.now();
    } else if (performance.now() - frameAt > FRAMELESS) {
      iterate();
      done = Atomics.load(ctrl, CTRL.PACE_US);
    }
    const own = performance.now() - frameAt > FRAMELESS, ms = own ? next - performance.now() : FRAMELESS;
    // (On its own clock, a timer: a waitAsync's timeout only wakes on Windows's 15 ms tick, so a sleep of 8 ms took 15 and the
    // ticks came in twos. A frame coming then is seen at the next tick.)
    if (ms > 0.2) {
      if (own && Atomics.waitAsync) await new Promise((r) => setTimeout(r, ms));
      else { const p = nap(ms); if (p) await p; }
    }
    if (!Atomics.waitAsync && performance.now() - yielded > 100) { yielded = performance.now(); await new Promise((r) => setTimeout(r, 0)); }
  }
}

self.addEventListener('message', (e) => {
  // Where the townsfolk stand (src/folk/layout.js bodies: x, z, radius, y), for the player to bump into.
  if (e.data.type === 'folk') { globalThis.folkBodies = mapFolk(e.data.buffer).bodies; return; }
  if (e.data.type === 'boot') boot(e.data).catch((err) => self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` }));
});
