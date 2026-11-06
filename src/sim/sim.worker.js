// The simulation thread. Runs the world at a fixed rate, independent of the display, and publishes
// complete snapshots for the render thread. Nothing in here waits on the GPU or the DOM.
import { CAVE_WALLS, OPENING, OPENING_YAW } from '../core/opening.js';
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
import { addUndead, corpsesNear, raiseZombie, stepCatacombs, stepWoods, TOWN_R, Zombie } from './undead.js';
import { ATTACKS, Knight, S } from './knight.js';
import { Player } from './player.js';
import { MAX_MANA } from './spells.js';
import { World } from './world.js';

// (shieldHit: how large a blade finds the shield. The swords and shields themselves are in Renderer.init: V for the black knight, T for the silver.)
// Velscour's knight, who keeps the church. He'll fight you if you come near, and when he's down the world goes on.
const BLACK = {
  spawn: [60, 0], yaw: -Math.PI / 2, hostile: true, hp: 520, walk: 1.5, swordScale: 1.085, shieldScale: 1.6, shieldHit: 1.3, bladeLen: 1,
  route: [[60, 0]], pauseClip: null,   // On guard before the cathedral's great door, and no further.
};
const SILVER = {
  spawn: [-2, 13], yaw: 2.6, hostile: false, hp: 420, walk: 1.35, swordScale: 0.96, shieldScale: 1.25, shieldHit: 1.2, bladeLen: 1,
  route: [[-7, 13], [-7, 19], [0, 19], [0, 13]], pauseClip: 'Idle_FoldArms_Loop',
};

// Keeps to the woods north of the village. hp is how long it fights; territory is how far from spawn it minds you.
const GRAVEHART = { spawn: [12, -128], lair: [-14, -150], yaw: 0.4, hp: 380, territory: 30 };
// Lies up in the south, and doesn't go looking for anyone.
// Down in the rift under the catacombs, on its burning floor, east of the bridge and the scaffold stair: see gulf() in tools/interior/build_interior.py. pit: where it can go.
const HYDRA = { spawn: [208, -128], lair: [217, -127], yaw: -1.57, hp: 900, territory: 24, pit: { y: -44.25, x0: 150, x1: 222, z0: -133, z1: -123 } };

const CRABS = [
  { spawn: [-92, -58], yaw: 1.0, hp: 55, delay: 20, flank: 1.1 },
  { spawn: [-120, 96], yaw: -0.9, hp: 55, delay: 50, flank: -1.2 },
  { spawn: [112, 92], yaw: -2.0, hp: 55, delay: 80, flank: 0.3 },
];

// How much faster than their clips each kind goes, by kind: knight, silver knight, crab, Gravehart, Hydra, undead, ogre.
// (Eased when the swords went: they have to cross open ground under fire, and a wizard has no parry.)
const HASTE = [1.1, 0.95, 1.1, 1, 1, 1.05, 1], CASTER_HASTE = 1.1;

class Sim {
  constructor() {
    this.packAt = 0; this.healSeen = 0; this.manaSeen = 0;
    this.time = 0; this.tick = 0; this.timeScale = 1; this.stopT = 0; this.slowT = 0; this.gameState = 0; this.gameT = 0;
    this.firstBloodAt = -1; this.crabWoke = false;
    this.knights = [];
    this.villagers = [];
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

  hitStop(t) { this.stopT = Math.max(this.stopT, t); }

  slowMo(t) { this.slowT = Math.max(this.slowT, t); }

  firstBlood() { if (this.firstBloodAt < 0) this.firstBloodAt = this.time; }

  restart() {
    this.player.reset();
    this.player.y = this.world.height(this.player.x, this.player.z);
    this.casting.reset();
    this.knights.forEach((k, i) => k.reset(k.opts));
    this.villagers.forEach((v) => v.reset());
    this.opening?.reset();
    this.foeWorks = []; this.foeBigAt = 0;
    this.gameState = 0; this.gameT = 0; this.time = 0; this.stopT = 0; this.timeScale = 1;
    this.reachedTown = false; this.packAt = 0; this.packN = 0; this.wave = null; this.lastMeleeAt = -9; this.firstBloodAt = -1; this.crabWoke = false; this.heartSeen = false; this.hydraSeen = false; this.slowT = 0; this.frozen = false; this.slow = 1;
    // Clicks made before the restart are spent.
    const p = this.player, inp = this.input;
    p.atkSeen = inp[INPUT.ATTACK]; p.wideSeen = inp[INPUT.WIDE]; p.jumpSeen = inp[INPUT.JUMP]; p.dodgeSeen = inp[INPUT.DODGE];
    const yaw = this.opening ? OPENING_YAW : Math.PI;
    this.input[INPUT.YAW] = yaw;
    this.input[INPUT.PITCH] = 0;
    self.postMessage({ type: 'restart', yaw });
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
    if (this.opening?.stage !== OPENING.NAME && this.opening?.stage !== OPENING.REVEAL) player.update(dt * (this.slow || 1), tdt, input, this);
    for (const k of this.knights) {
      const ox = k.x, oz = k.z;
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
      // And the town is safe ground: nothing that hunts you comes in. (The silver knight lives there.)
      if (k.kind !== 1 && Math.hypot(k.x, k.z) < TOWN_R && Math.hypot(ox, oz) >= TOWN_R) { k.x = ox; k.z = oz; }
      if (k.champion && !k.dead && this.tick % 10 === 0) this.event(EV.CHAMPION, k.x, k.y + 1.3, k.z);
      // Each death leaves its loot once.
      if (k.dead && !k.looted) { k.looted = true; this.casting.mana = Math.min(this.casting.maxMana, this.casting.mana + 6); this.event(EV.LOOT, k.x, k.opts?.pit ? k.y : this.world.height(k.x, k.z), k.z, k.champion ? 8 : k.opts?.lootKind ?? k.kind); }
      if (!k.dead) k.looted = false;
    }
    if (this.opening) this.opening.update(tdt);
    else for (const v of this.villagers) v.update(this.frozen ? 0 : tdt, this.world);
    this.separate();
    this.casting.update(dt * (this.slow || 1), tdt, input, this);
    stepFoeWorks(tdt, this);
    stepCatacombs(this);
    stepWoods(this);
    const snap = this.scratch;
    player.write(snap, this);
    this.casting.write(snap);
    this.knights.forEach((k, i) => k.write(snap, this.charOffset(i), this));
    this.villagers.forEach((v, i) => v.write(snap, this.charOffset(this.knights.length + i)));
    snap[H.OPENING] = this.opening?.stage ?? OPENING.OFF;
    snap[H.OPENING_TIME] = this.opening?.time ?? 0;
    snap[H.OPENING_NEXT] = this.opening ? this.villagers[1].next : 0;
    player.sweep(snap, this);
    this.knights.forEach((k, i) => k.writeGashes(snap, this.charOffset(i), this));
    this.plan();
    snap[H.TIME] = this.time; snap[H.TICK] = this.tick;
    snap[H.NCHARS] = this.knights.length + this.villagers.length;
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
      if (body.kind !== 1 && Math.hypot(x, z) < TOWN_R && Math.hypot(body.x, body.z) >= TOWN_R) return false;
    }
    const pos = this.nudgePosition;
    pos[0] = x; pos[2] = z;
    if (this.world.resolve(pos, radius, body.y + 0.2)) return false;
    body.x = x; body.z = z;
    if (body === this.player) body.keepToLand();
    return true;
  }

  // Bodies don't pass through each other: plate armour shoulders the player aside, and knights too.
  separate() {
    const p = this.player;
    const list = [...this.knights, ...(this.opening ? this.villagers.slice(1) : this.villagers)];
    for (const k of list) {
      if (k.dead || k.dormant) continue;
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
        if (a.dead || b.dead || a.dormant || b.dormant) continue;
        const R = (a.bodyRadius || 0.5) * 0.7 + (b.bodyRadius || 0.5) * 0.7;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
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
      case 19: if (k.sever) k.sever(this, b | 0); break;
      case 20: if (k.startCast) { k.goal = 1; k.aggro = true; k.hostile = true; k.startCast(this, Object.keys(FOE)[b | 0]); } break;
      case 10: k.hostile = true; k.combat = 1; k.combatTarget = 1; k.shieldUp = 1; k.shieldTarget = 1; k.pauseT = 0; break;
      case 11: this.restart(); break;
      case 13: this.slow = b; break;
      case 17: p.damage(this, 1000, p.x + 1, p.z, 0); break;
      case 14: this.manual = true; this.manualTicks = b; break;
      case 15: this.manual = false; break;
      case 12: this.knights.forEach((n) => { if (n.wakeAt !== undefined) n.wakeAt = 0; }); break;
      default: break;
    }
  }

  publish() {
    if (this.shared) {
      const { ctrl, snaps } = this.shared;
      const latest = Atomics.load(ctrl, CTRL.LATEST), reading = Atomics.load(ctrl, CTRL.READING);
      let slot = 0;
      while (slot === latest || slot === reading) slot++;
      snaps[slot].set(this.scratch);
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
  if (!d) return;
  const p = this.player;
  const floor = this.world.heightFor(d.x, d.z, d.y);
  p.x = d.x; p.z = d.z; p.y = Math.max(d.y, floor);
  p.onGround = p.y <= floor + 0.06;
  p.vx = 0; p.vy = 0; p.vz = 0; p.yaw = d.yaw;
  if (this.opening && d.opening) {
    this.opening.setStage(d.opening);
    if (d.guide) for (const v of this.villagers) {
      [v.x, v.z, v.yaw, v.next] = d.guide;
      v.y = this.world.height(v.x, v.z);
    }
  }
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
  const base = msg.base;
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
  if (msg.opening) village.colliders.push(...CAVE_WALLS);
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
    if (m.type === 'openingName' && sim.opening?.stage === OPENING.NAME) sim.opening.setStage(OPENING.LEAVE);
    if (m.type !== 'place') return;
    try { sim.place(m.data); self.postMessage({ type: 'placed', id: m.id }); } catch (err) {
      console.error(err);
      self.postMessage({ type: 'placed', id: m.id, error: err.message });
    }
  });
  self.postMessage({ type: 'ready', bytes: TOTAL_BYTES });

  // Fixed step. In a worker Atomics.wait is an exact sleep; without shared memory fall back to timers.
  const hz = msg.hz, dt = 1 / hz;
  let next = performance.now();
  let lastPublish = 0;
  const sleeper = msg.buffer ? new Int32Array(new SharedArrayBuffer(4)) : null;
  const iterate = () => {
    const now = performance.now();
    let steps = 0;
    while (now >= next && steps < 6) {
      // A bug in one tick is logged once and the world carries on, rather than the game freezing.
      try { sim.step(dt); } catch (err) {
        if (!sim.reported) { sim.reported = true; self.postMessage({ type: 'error', message: `${err.message}
${err.stack}` }); }
      }
      next += 1000 / hz; steps++;
    }
    if (now - next > 250) next = now;
    if (steps) {
      if (sim.shared || now - lastPublish > 7) { sim.publish(); lastPublish = now; }
    }
  };
  if (sleeper) {
    let yielded = performance.now();
    for (;;) {
      iterate();
      const wait = next - performance.now();
      if (wait > 0.2) Atomics.wait(sleeper, 0, 0, wait);
      // Let queued messages through (saves and loads) a few times a second, paused or not.
      if (performance.now() - yielded > 100) { yielded = performance.now(); await new Promise((r) => setTimeout(r, 0)); }
    }
  } else {
    const loop = () => { iterate(); setTimeout(loop, 2); };
    loop();
  }
}

self.addEventListener('message', (e) => {
  if (e.data.type === 'boot') boot(e.data).catch((err) => self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` }));
});
