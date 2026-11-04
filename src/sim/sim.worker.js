// The simulation thread. Runs the world at a fixed rate, independent of the display, and publishes
// complete snapshots for the render thread. Nothing in here waits on the GPU or the DOM.
import { parseGLB } from '../core/glb.js';
import { CHARS_START, CTRL, C_SIZE, EV, EV_CAPACITY, EV_FLOATS, H, INPUT, PLAN_FLOATS, PLAN_OBS, PLAN_TACTICS, SNAP_FLOATS, TOTAL_BYTES, mapShared } from '../core/layout.js';
import { ArmsRig, ClipBank, Rig } from './anim.js';
import { CRAB_SCALE, Crab } from './crab.js';
import { ATTACKS, Knight, S } from './knight.js';
import { Player } from './player.js';
import { World } from './world.js';

const BLACK = {
  spawn: [-7, -7], yaw: 1.2, hostile: true, hp: 480, walk: 1.5, swordScale: 1.75, shieldScale: 1.3, bladeLen: 0.62,
  route: [[-8, -6], [7, -8], [10, 8], [-6, 11], [-11, 4]], pauseClip: null,
};
const SILVER = {
  spawn: [-2, 13], yaw: 2.6, hostile: false, hp: 420, walk: 1.35, swordScale: 1.6, shieldScale: 1.2, bladeLen: 0.6,
  route: [[4, 13], [11, 12], [12, -2], [6, -13], [-6, -13], [-13, -6], [-11, 12]], pauseClip: 'Idle_FoldArms_Loop',
};

const CRABS = [
  { spawn: [-40, -28], yaw: 1.0, hp: 170, delay: 20, flank: 1.1 },
  { spawn: [42, -24], yaw: -0.9, hp: 170, delay: 50, flank: -1.2 },
  { spawn: [42, 26], yaw: -2.0, hp: 170, delay: 80, flank: 0.3 },
];

class Sim {
  constructor() {
    this.time = 0; this.tick = 0; this.timeScale = 1; this.stopT = 0; this.slowT = 0; this.gameState = 0; this.gameT = 0;
    this.firstBloodAt = -1; this.crabWoke = false;
    this.knights = [];
    this.scratch = new Float32Array(SNAP_FLOATS);
    this.snapU = new Uint32Array(this.scratch.buffer);
    this.tacticWeights = new Float32Array(PLAN_TACTICS).fill(1);
    this.rollouts = 0;
    this.pendingEvents = [];
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
    this.knights.forEach((k, i) => k.reset(k.opts));
    this.gameState = 0; this.gameT = 0; this.time = 0;
    this.firstBloodAt = -1; this.crabWoke = false; this.slowT = 0; this.frozen = false; this.slow = 1;
    // Clicks made before the restart are spent.
    const p = this.player, inp = this.input;
    p.atkSeen = inp[INPUT.ATTACK]; p.wideSeen = inp[INPUT.WIDE]; p.jumpSeen = inp[INPUT.JUMP]; p.dodgeSeen = inp[INPUT.DODGE];
    this.input[INPUT.YAW] = Math.PI;
    this.input[INPUT.PITCH] = 0;
    self.postMessage({ type: 'restart' });
  }

  step(dt) {
    const { input, player } = this;
    if (input[INPUT.PAUSE] > 0.5) { if (this.shared) this.shared.plan[9] = 0; return; }
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
    player.update(dt * (this.slow || 1), tdt, input, this);
    for (const k of this.knights) k.update(this.frozen ? 0 : tdt, this);
    this.separate();
    const snap = this.scratch;
    player.write(snap, this);
    this.knights.forEach((k, i) => k.write(snap, this.charOffset(i), this));
    player.sweep(snap, this);
    this.knights.forEach((k, i) => k.writeGashes(snap, this.charOffset(i), this));
    if (this.gameState === 0) {
      const black = this.knights[0];
      if (black.dead && black.deadT > 2.5) { this.gameState = 1; this.gameT = 0; this.event(EV.WIN); }
    }
    this.plan();
    snap[H.TIME] = this.time; snap[H.TICK] = this.tick;
    snap[H.NCHARS] = this.knights.length;
    snap[H.GAME] = this.gameState; snap[H.GAME_T] = this.gameT;
    snap[H.TIME_SCALE] = this.timeScale * (this.slowT > 0 ? 0.25 : 1);
    snap[H.TACTIC] = this.knights[0].tactic;
    snap[H.ROLLOUTS] = this.rollouts;
    snap[H.PARRIED] = this.knights[0].stats.parried || 0;
  }

  // Bodies don't pass through each other: plate armour shoulders the player aside, and knights too.
  separate() {
    const p = this.player;
    for (const k of this.knights) {
      if (k.dead) continue;
      const P = k.bodyRadius || 0.82;
      const dx = p.x - k.x, dz = p.z - k.z, d = Math.hypot(dx, dz);
      if (d < P && d > 1e-3 && !k.iframes) {
        const push = (P - d) / d;
        p.x += dx * push * 0.8; p.z += dz * push * 0.8;
        k.x -= dx * push * 0.2; k.z -= dz * push * 0.2;
      }
    }
    const list = this.knights;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dead || b.dead) continue;
        const R = (a.bodyRadius || 0.5) * 0.7 + (b.bodyRadius || 0.5) * 0.7;
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d < R && d > 1e-3) {
          const push = (R - d) / d * 0.5;
          b.x += dx * push; b.z += dz * push; a.x -= dx * push; a.z -= dz * push;
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
      case 8: p.hp = p.maxHp; break;
      case 9: k.hp = 1; break;
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
  const [clipsMeta, clipsBin, black, silver, armsBuf, village, crabBuf] = await Promise.all([
    fetch(`${base}assets/game/clips.json`).then((r) => r.json()),
    fetchBuf(`${base}assets/game/clips.bin`),
    fetchBuf(`${base}assets/game/velscour_knight.glb`),
    fetchBuf(`${base}assets/game/silver_knight.glb`),
    fetchBuf(`${base}assets/fp/arms_2h.glb`),
    fetch(`${base}assets/game/village.json`).then((r) => r.json()),
    fetchBuf(`${base}assets/monsters/crab_monster/crab_monster.glb`),
  ]);
  const bank = new ClipBank(clipsMeta, clipsBin);
  sim.world = new World(village);
  sim.player = new Player(new ArmsRig(armsBuf));
  sim.knights.push(new Knight(0, 0, new Rig(parseGLB(black), bank), bank, BLACK));
  sim.knights.push(new Knight(1, 1, new Rig(parseGLB(silver), bank), bank, SILVER));
  const crabRig = new ArmsRig(crabBuf, CRAB_SCALE);
  CRABS.forEach((c, i) => sim.knights.push(new Crab(2 + i, 2, crabRig, c)));
  sim.restartSeen = sim.input[INPUT.RESTART];
  sim.cmdSeen = sim.input[INPUT.CMD];
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
    for (;;) {
      iterate();
      const wait = next - performance.now();
      if (wait > 0.2) Atomics.wait(sleeper, 0, 0, wait);
      // Let queued messages through once in a while.
      if (sim.tick % 240 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  } else {
    const loop = () => { iterate(); setTimeout(loop, 2); };
    loop();
  }
}

self.addEventListener('message', (e) => {
  if (e.data.type === 'boot') boot(e.data).catch((err) => self.postMessage({ type: 'error', message: `${err.message}\n${err.stack}` }));
});
