// Playing as one of your party (src/ui/heroplay.js is the render thread's half): the hero's own body, blows and moves, driven
// by your hands instead of their brain, from behind them, the way an action MMO plays (TERA's lancer most of all).
//
// The hero stays a Hero (src/sim/hero.js): its clips, its holds, its moves (heroskills.js) and its numbers are all its own.
// What changes: it doesn't think (HeroWorld.think is skipped); it walks where the keys say, relative to the camera, and turns
// to the crosshair to strike; its blows and moves are fired by the mouse and the bar's keys at what the crosshair is on.
// You (the wizard) ride along out of sight where it stands, so everything that goes by where you are (the map, the quests,
// the doors, the portals, the party's heel, the camera) goes by the hero; and a blow meant for you lands on the hero.
//
// With auto-play on, the hero you're playing fights as one of your party does (HeroWorld.companion), and walks where auto-play
// walks you between fights.
//
// The keys (read from INPUT, so nothing new crosses but the bar's keys and the left button held):
//   left button: the class's blows (held, they chain); right button: block (a board) or a heavy blow (anything else);
//   1-9, 0: the bar; Space: the chain's next move when one's offered, else an evade; Q: an evade; Shift: run on.
// The party's four calls (Dragon's Dogma's pawns): Z Go (onto what you're on), X To me, C Wait, G Help.
import { H, INPUT, EV } from '../core/layout.js';
import { clamp, damp, wrapAngle } from '../core/math.js';
import { MOVE_KEYS } from '../core/heroes.js';
import { ELEM, FX } from './spells.js';
import { fightable, radiusOf } from './hero.js';
import { BAR_SLOTS, CALLS, CHAINS, chainOf, PLAYER_MOVES, barOf, cdOf } from './heroplay-moves.js';
import { OPENING } from '../core/opening.js';

// Moves that want something living to go at, and how far it may be: past it they go at the crosshair's point.
const GAP_MOVES = new Set(['charge', 'valiant_leap', 'phalanx_rush', 'crusaders_charge', 'flip_strike', 'death_from_above', 'shadow_step', 'leaping_kick', 'jump', 'dragon_dive', 'comet_dive', 'storm_dive', 'dragonfall', 'spearstep', 'tempest_dash', 'star_storm', 'kick_chain']);
const RUN = 5.2, SPRINT = 7.4, BLOCK_WALK = 1.5, SWING_WALK = 0.25;
const EVADE_CD = 1.1, EVADE_T = 0.32, EVADE_V = 10;
// The party's calls: how long each holds, Wait and To me till another is given; Go and Help for a while.
const CALL_FOR = { go: 20, come: 1e9, wait: 1e9, help: 15 };
const CHAIN_FOR = 2.2, CHAIN_CUT = 0.5;

export class HeroPlay {
  constructor(sim) {
    this.sim = sim;
    this.h = null;            // the hero you are
    this.auto = false;        // auto-play is on: it fights on its own
    this.held = false;        // the left button held
    this.cds = new Float32Array(BAR_SLOTS);
    this.bar = [];
    this.chain = null;        // { key, t }
    this.target = null;
    this.evadeCd = 0; this.evadeT = 0; this.ex = 0; this.ez = 0;
    this.heavyCd = 0; this.swingT = 0; this.aimT = 0;
    this.call = null;         // { kind, t, foe }
    this.seen = null;
    this.blockedAt = -9;
  }

  get on() { return !!this.h; }

  message(m) {
    if (m.op === 'take') this.take(m.slot);
    else if (m.op === 'release') this.release();
    else if (m.op === 'auto') this.auto = !!m.on;
    else if (m.op === 'held') this.held = !!m.on;
    else if (m.op === 'skill') this.pressed = m.i;
    else if (m.op === 'call') this.order(m.kind);
  }

  // ---- taking a body, giving it back --------------------------------------------------------------------------------

  take(slot) {
    const sim = this.sim, h = sim.heroes[slot], p = sim.player;
    if (!h || !h.hired || h.dead || h.surf || p.dead || sim.unarmed || (sim.opening && sim.opening.stage > OPENING.OFF && sim.opening.stage < OPENING.ARRIVED)) { this.say('refused', slot); return; }
    if (this.h && this.h !== h) this.release(true);
    const fresh = !this.h;
    this.h = h; h.driven = true;
    h.goal = null; h.hold = 0; h.sitting = false; h.gesture = null; h.talkUntil = 0; h.walkWith = null;
    if (fresh) { this.wizHp = p.hp; this.wizMax = p.maxHp; }
    p.surfing = false; p.vx = p.vz = p.vy = 0;
    this.lastX = h.x; this.lastZ = h.z;
    this.mirror = null;
    this.bar = barOf(h);
    this.cds.fill(0); this.chain = null; this.target = null;
    this.seen = { atk: sim.input[INPUT.ATTACK], wide: sim.input[INPUT.WIDE], jump: sim.input[INPUT.JUMP], dodge: sim.input[INPUT.DODGE] };
    if (h.fxOk()) sim.casting.burst(FX.COLUMN, ELEM.SPIRIT, h.x, h.y, h.z, 0.5, 1, 0.7, { light: 10, lightR: 5, len: 2.4 });
    // (Facing the way the camera looks from behind them.)
    self.postMessage({ type: 'look', yaw: h.faceYaw ?? h.yaw, pitch: -0.12 });
    sim.input[INPUT.YAW] = h.faceYaw ?? h.yaw;
    this.say('taken', slot);
    this.sendBar();
  }

  // You, back in your own body, standing where they were (or a step off it).
  release(swap = false) {
    const sim = this.sim, h = this.h, p = sim.player, inp = sim.input;
    if (!h) return;
    h.driven = false; h.playBlock = false; h.shieldTarget = 0; h.goal = null; h.foe = null;
    this.h = null; this.chain = null; this.target = null; this.held = false;
    if (swap) return;
    const a = (h.faceYaw ?? h.yaw) + Math.PI * 0.5;
    const spot = h.clearSpot(sim, h.x + Math.sin(a) * 1.2, h.z + Math.cos(a) * 1.2);
    p.x = spot[0]; p.z = spot[1]; p.y = sim.world.heightFor ? sim.world.heightFor(p.x, p.z, h.y) : sim.world.height(p.x, p.z);
    p.vx = p.vz = p.vy = 0; p.onGround = true;
    p.maxHp = this.wizMax ?? p.maxHp; p.hp = Math.max(1, Math.min(p.maxHp, this.wizHp ?? p.maxHp));
    // (Clicks and presses made while you were them are spent.)
    p.atkSeen = inp[INPUT.ATTACK]; p.wideSeen = inp[INPUT.WIDE]; p.jumpSeen = inp[INPUT.JUMP]; p.dodgeSeen = inp[INPUT.DODGE]; p.queued = null;
    sim.casting.castSeen = inp[INPUT.CAST_N];
    if (h.fxOk()) sim.casting.burst(FX.COLUMN, ELEM.ARCANE, p.x, p.y, p.z, 0.5, 1, 0.7, { light: 10, lightR: 5, len: 2.4 });
    this.say('released', h.slot);
  }

  say(what, slot) { self.postMessage({ type: 'heroPlay', what, slot }); }
  // The bar as the sim has it (the screen draws this one, so a key is always the move it shows).
  sendBar() { if (this.h) self.postMessage({ type: 'heroPlay', what: 'bar', bar: this.bar, level: this.h.person.level }); }

  // ---- each tick: before the world (in place of your own update) and after it (you, put where they are) -------------

  // In place of Player.update: your eyes are the camera's, your hands are theirs.
  carry(dt) {
    const sim = this.sim, p = sim.player, h = this.h, inp = sim.input;
    if (!h.hired || (h.dead && !this.anyUp())) { this.release(); return false; }
    p.yaw = inp[INPUT.YAW]; p.pitch = inp[INPUT.PITCH];
    // Moved by something else (a portal, the beacon, a command): the hero goes too.
    if (Math.hypot(p.x - this.lastX, p.z - this.lastZ) > 3) sim.heroWorld.place(h, p.x, p.z);
    p.dead = false; p.surfing = false;
    return true;
  }

  // Someone of your party still standing (the hero you are has fallen, and they may yet get you up).
  anyUp() { for (const o of this.sim.heroWorld.company.members) if (o !== this.h && !o.dead) return true; return false; }

  // After the world's step: you where they are, their life as yours (what's healed in you is healed in them).
  glue() {
    const sim = this.sim, p = sim.player, h = this.h;
    if (!h) return;
    p.x = h.x; p.z = h.z; p.y = h.y - (h.air || 0);
    p.vx = h.vx; p.vz = h.vz; p.vy = 0; p.onGround = true;
    this.lastX = p.x; this.lastZ = p.z;
    if (this.mirror !== null && p.hp > this.mirror + 0.01 && !h.dead) h.hp = Math.min(h.maxHp, h.hp + (p.hp - this.mirror) / p.maxHp * h.maxHp);
    p.hp = h.dead ? 1 : Math.max(1, h.hp / h.maxHp * p.maxHp);
    this.mirror = p.hp;
  }

  // A blow meant for you lands on the hero you are (Player.damage hands it over).
  hurt(amount, fromX, fromZ, knock, unblockable) {
    const h = this.h;
    if (!h || h.dead) return false;
    return h.damage(this.sim, amount * 0.85, fromX, fromZ, Math.max(0, knock || 0), unblockable);
  }

  // A blow turned on the board, from the front: the counter's offered (TERA's Shield Counter).
  blocked() {
    const cls = this.h?.person.cls;
    this.blockedAt = this.sim.time;
    const counter = chainOf(cls, 'block', this.bar);
    if (counter) this.chain = { key: counter, t: CHAIN_FOR };
    this.sim.event(EV.BLOCK, this.h.x, this.h.y + 1.2, this.h.z, 0, 0.1, 0, -1);
  }

  // ---- the hero, each tick (in place of HeroWorld.think) -------------------------------------------------------------

  think(h, dt) {
    const sim = this.sim, w = sim.heroWorld, inp = sim.input;
    for (let i = 0; i < BAR_SLOTS; i++) this.cds[i] = Math.max(0, this.cds[i] - dt);
    this.evadeCd -= dt; this.heavyCd -= dt; this.aimT -= dt;
    if (this.chain && (this.chain.t -= dt) <= 0) this.chain = null;
    // (Their book may have changed: the bar's kept to it.)
    if ((this.barT = (this.barT || 0) - dt) <= 0) { this.barT = 1; const b = barOf(h); if (b.join() !== this.bar.join()) { this.bar = b; this.cds.fill(0); this.sendBar(); } }
    const s = this.seen;
    const atk = inp[INPUT.ATTACK] !== s.atk, wide = inp[INPUT.WIDE] !== s.wide, jump = inp[INPUT.JUMP] !== s.jump, dodge = inp[INPUT.DODGE] !== s.dodge;
    s.atk = inp[INPUT.ATTACK]; s.wide = inp[INPUT.WIDE]; s.jump = inp[INPUT.JUMP]; s.dodge = inp[INPUT.DODGE];
    const pressed = this.pressed; this.pressed = undefined;
    if (h.dead) { h.playBlock = false; return; }
    // The crosshair's foe: whatever's nearest the middle of the screen, within reach of the eye.
    this.target = this.aimAt(h);
    // Auto-play: in a fight, one of your party as any other; out of one, walking where auto-play walks you.
    h.driveAuto = this.auto && w.companyFight().length > 0;
    if (h.driveAuto) {
      h.playBlock = false; h.goal = null;
      w.companion(h, dt);
      return;
    }
    const camYaw = inp[INPUT.YAW];
    // The move keys, as the camera has them: W away from it, D to its right.
    const mx = inp[INPUT.MOVE_X], mz = inp[INPUT.MOVE_Z], L = Math.hypot(mx, mz);
    const sn = Math.sin(camYaw), cs = Math.cos(camYaw);
    let dx = 0, dz = 0;
    if (L > 0.1) { dx = (mx * -cs + mz * sn) / Math.max(1, L); dz = (mx * sn + mz * cs) / Math.max(1, L); }
    // The board up while the right button's held (a lancer's or a paladin's); anyone else's right button is a heavy blow.
    const board = h.shieldStyle;
    const blocking = board && inp[INPUT.BLOCK] > 0.5 && !h.jump && !h.charge;
    h.playBlock = blocking;
    if (blocking) { h.shieldTarget = 1; if (h.swing?.blow) { h.swing = null; h.stopAction(0.08); } } else if (!h.swing) h.shieldTarget = h.foe && board ? 0.58 : 0;
    // The evade (Q, or Space with no chain offered): a backstep behind the board for plate, a roll for anyone else.
    if ((dodge || (jump && !this.chain)) && this.evadeCd <= 0 && !h.jump && !h.charge) this.evade(h, dx, dz, camYaw);
    else if (jump && this.chain) this.useChain(h);
    if (pressed !== undefined) this.useSlot(h, pressed);
    // The blows: a click, or the button held (they chain one after another, TERA's way).
    if ((atk || this.held) && !blocking && !h.swing && !h.jump && !h.charge && this.evadeT <= 0 && h.shotCd <= 0) this.strike(h);
    if (wide && !board && this.heavyCd <= 0 && !h.swing && !h.jump) this.heavy(h);
    h.foe = this.target && fightable(this.target) ? this.target : null;
    // Where to go, and which way to face: to the crosshair while fighting or blocking, else the way you're going.
    const fighting = blocking || this.aimT > 0 || !!h.swing;
    let sp = inp[INPUT.SPRINT] > 0.5 && !h.foe ? SPRINT : RUN;
    sp *= h.cls.run * (h.buff?.speed || 1) * (h.hurt > 0.5 ? 0.85 : 1);
    if (blocking) sp = BLOCK_WALK;
    else if (h.swing) sp = h.swing.still || h.swing.root ? 0 : RUN * SWING_WALK;
    h.driveVX = dx * sp; h.driveVZ = dz * sp;
    if (this.evadeT > 0) { this.evadeT -= dt; h.driveVX = this.ex; h.driveVZ = this.ez; }
    if (fighting && !h.charge && !h.jump) h.driveFace = camYaw;
    else if (L > 0.1) h.driveFace = Math.atan2(dx, dz);
    else h.driveFace = h.faceYaw;
  }

  // What the crosshair's on: the foe whose middle is nearest the line you look along, a little more to the near, and
  // anything at your elbow before you.
  aimAt(h) {
    const sim = this.sim, inp = sim.input, yaw = inp[INPUT.YAW], pitch = inp[INPUT.PITCH];
    const fx = Math.sin(yaw) * Math.cos(pitch), fy = Math.sin(pitch), fz = Math.cos(yaw) * Math.cos(pitch);
    const ex = sim.sight ? sim.sight[0] : h.x, ey = sim.sight ? sim.sight[1] : h.y + 1.9, ez = sim.sight ? sim.sight[2] : h.z;
    const reach = h.cls.ranged ? 30 : 22;
    let best = null, bs = 1e9;
    for (const m of sim.heroWorld.targets) {
      if (!fightable(m)) continue;
      const d = Math.hypot(m.x - h.x, m.z - h.z);
      if (d > reach || Math.abs(m.y - h.y) > 6) continue;
      const tx = m.x - ex, ty = m.y + 1.0 - ey, tz = m.z - ez, tl = Math.hypot(tx, ty, tz) || 1;
      const along = (tx * fx + ty * fy + tz * fz) / tl, ang = Math.acos(clamp(along, -1, 1));
      const near = d - radiusOf(m) < 2.6 && Math.abs(wrapAngle(Math.atan2(m.x - h.x, m.z - h.z) - yaw)) < 1.0;
      if (ang > 0.42 && !near) continue;
      const sc = (near ? 0 : ang * 6) + d * 0.04 + (m === this.target ? -0.25 : 0);
      if (sc < bs) { bs = sc; best = m; }
    }
    return best;
  }

  // Where the crosshair points on the ground, this far off at most: for moves aimed with nothing under it.
  aimPoint(h, far) {
    const sim = this.sim, yaw = sim.input[INPUT.YAW];
    const x = h.x + Math.sin(yaw) * far, z = h.z + Math.cos(yaw) * far;
    return { x, z, y: sim.world.height(x, z), yaw: 0, hp: 1, maxHp: 1, dead: false, dormant: true, opts: { height: 1.8 }, scale: 1, proxy: true };
  }

  // The class's blows at the crosshair (their own: Hero.blow, shoot, pluck, throwBoomerang).
  strike(h) {
    const sim = this.sim, m = this.target || this.aimPoint(h, h.cls.ranged ? 20 : 2);
    h.yaw = h.faceYaw = sim.input[INPUT.YAW];
    this.aimT = 1.2;
    this.safe(() => {
      const d = Math.hypot(m.x - h.x, m.z - h.z);
      if (!h.cls.ranged || (d < 2.2 && !h.luteP && !m.proxy)) h.blow(sim, m);
      else if (h.style === 'bow') h.shoot(sim, m);
      else if (h.person.cls === 'bard') h.pluck(sim, m);
      else h.throwBoomerang(sim, m, (h.throwN = (h.throwN || 0) + 1) % 2);
    });
    // (Held, the next comes as soon as the last is done, a little quicker than the AI's own breath between them.)
    h.shotCd = Math.min(h.shotCd, h.cls.ranged ? 0.45 : 0.12);
  }

  // The right button, for those without a board: the class's heaviest blow, hard.
  heavy(h) {
    const sim = this.sim, m = this.target || this.aimPoint(h, h.cls.ranged ? 20 : 2);
    h.yaw = h.faceYaw = sim.input[INPUT.YAW];
    this.aimT = 1.2; this.heavyCd = 2.6;
    this.safe(() => {
      if (h.cls.ranged && h.style === 'bow') { h.shoot(sim, m); h.draw = 1; }
      else { const b = h.blows[h.blows.length - 1]; h.blow(sim, m, { ...b, dmg: b.dmg * 1.8, rate: b.rate * 0.85 }); }
    });
  }

  // Out of the way of it, untouchable for most of it: back behind the board for plate (TERA's Backstep), a roll for the rest.
  evade(h, dx, dz, camYaw) {
    const sim = this.sim, plate = h.shieldStyle || h.person.cls === 'dragoon';
    if (dx === 0 && dz === 0) { dx = -Math.sin(camYaw); dz = -Math.cos(camYaw); }
    const L = Math.hypot(dx, dz) || 1;
    this.ex = dx / L * EVADE_V * (plate ? 0.8 : 1); this.ez = dz / L * EVADE_V * (plate ? 0.8 : 1);
    this.evadeT = EVADE_T; this.evadeCd = EVADE_CD; h.iframesT = EVADE_T + 0.1;
    if (h.swing) { h.swing = null; h.charge = null; h.stopAction(0.06); }
    if (!plate) {
      h.yaw = h.faceYaw = Math.atan2(dx, dz);
      h.startSwing('Roll', 1.6, [], () => {}, { root: true, end: 0.8 });
      h.swing.evade = true;
    } else h.shieldTarget = 1;
    sim.event(EV.DODGE, h.x, h.y, h.z, 0);
  }

  // A key of the bar.
  useSlot(h, i) {
    const key = this.bar[i];
    if (!key) return;
    if (this.chain && this.chain.key === key) { this.useChain(h); return; }
    if (this.cds[i] > 0 || h.jump || h.charge || (h.swing && !h.swing.blow && !h.swing.evade)) return;
    if (this.fire(h, key)) this.cds[i] = cdOf(h.person.cls, key);
  }

  useChain(h) {
    const c = this.chain;
    if (!c || h.jump || h.charge) return;
    if (h.swing) { h.swing = null; h.stopAction(0.05); }
    this.chain = null;
    if (!this.fire(h, c.key, true)) return;
    const i = this.bar.indexOf(c.key);
    if (i >= 0) this.cds[i] = cdOf(h.person.cls, c.key) * CHAIN_CUT;
  }

  // A move, by its key: the hero's own (Hero.skill), the healer's light and the bard's songs, and the player's own few.
  fire(h, key, chained = false) {
    const sim = this.sim, w = sim.heroWorld, cls = h.person.cls;
    let m = this.target;
    const yaw = sim.input[INPUT.YAW];
    if (!m || !fightable(m)) m = this.aimPoint(h, GAP_MOVES.has(key) ? 9 : h.cls.ranged ? 16 : 3);
    h.yaw = h.faceYaw = m.proxy ? yaw : Math.atan2(m.x - h.x, m.z - h.z);
    this.aimT = 1.4;
    h.moveKey = key;
    let ok = true;
    this.safe(() => {
      if (key === 'holy_light') this.mendLight(h);
      else if (key === 'war_song' || key === 'marching_song' || key === 'mending_song') this.song(h, key);
      else if (key === 'leash') ok = this.leash(h, m);
      else if (key === 'challenging_shout') this.shout(h);
      else if (key === 'shield_counter') this.counter(h, m);
      else h.skill(sim, key, m);
    });
    if (!ok) return false;
    const next = chainOf(cls, key, this.bar);
    if (next) this.chain = { key: next, t: CHAIN_FOR + (chained ? 0 : 0.4) };
    else if (chained) this.chain = null;
    if (Math.random() < 0.3) h.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(key));
    return true;
  }

  // A move's bug mustn't stop the world: logged once, and the move's lost.
  safe(fn) {
    try { fn(); } catch (err) {
      if (!this.warned) { this.warned = true; console.error('[heroplay]', err); }
    }
  }

  // ---- the moves only a hand plays ----------------------------------------------------------------------------------

  // Leash (TERA's): a chain of light to it, and it's dragged to the front of the board. Not what's too big to drag.
  leash(h, m) {
    const sim = this.sim;
    if (!m || m.proxy || !fightable(m)) { this.say('noTarget', h.slot); return false; }
    const d = Math.hypot(m.x - h.x, m.z - h.z);
    if (d > PLAYER_MOVES.lancer.leash.range) { this.say('tooFar', h.slot); return false; }
    h.startSwing('OverhandThrow', 1.4, [0.42], () => {
      const hand = h.handPos('l');
      const mx = m.x, mz = m.z, L = Math.hypot(mx - hand[0], mz - hand[2]) || 1;
      sim.casting.burst(FX.BEAM, ELEM.STORM, hand[0], hand[1], hand[2], 0.05, 0.03, 0.5, { ax: (mx - hand[0]) / L, ay: (m.y + 1 - hand[1]) / L, az: (mz - hand[2]) / L, len: L, light: 8, lightR: 4, extra: 0.03 });
      sim.casting.burst(FX.FLARE, ELEM.STORM, mx, m.y + 1, mz, 0.4, 1.0, 0.25);
      h.hit(sim, m, 6 * h.power(), 'bash', 40, 0, { quiet: true });
      m.tauntBy = h; m.tauntT = sim.time + 6; m.heroFoe = h; m.heroFoeT = sim.time;
      if (radiusOf(m) <= 1 && !m.boss) {
        const to = Math.max(0, d - 2.2), ux = (h.x - m.x) / (d || 1), uz = (h.z - m.z) / (d || 1);
        sim.casting.shove(m, ux * to * 3.2, uz * to * 3.2, 2);
        sim.heroWorld.stun(m, 0.9, h);
      }
      sim.event(EV.WHOOSH, mx, m.y + 1, mz);
    }, { still: true, mask: 'upper' });
    return true;
  }

  // Challenging Shout: everything within ten metres turns on him for a while, and a ring of his colour goes out.
  shout(h) {
    const sim = this.sim, w = sim.heroWorld;
    h.startSwing('L_Angry', 1.5, [0.3], () => {
      for (const k of w.targets) if (fightable(k) && Math.hypot(k.x - h.x, k.z - h.z) < 10) { k.tauntBy = h; k.tauntT = sim.time + 6; k.heroFoe = h; k.heroFoeT = sim.time; }
      if (h.fxOk()) { sim.casting.burst(FX.RING, ELEM.STORM, h.x, h.y + 0.06, h.z, 1, 10, 0.55, { alpha: 0.8, light: 10, lightR: 8 }); sim.casting.burst(FX.RING, ELEM.LIGHT, h.x, h.y + 1.2, h.z, 0.3, 4, 0.3); }
      sim.event(EV.TAUNT, h.x, h.y + 1.6, h.z);
    }, { mask: 'upper', end: 0.7 });
  }

  // Shield Counter: after a blow's turned, the board's punched into everything before it, twice as hard, and they reel.
  counter(h, m) {
    const sim = this.sim;
    h.shieldTarget = 1;
    h.startSwing('L_ShieldJab', 1.9, [0.5], () => {
      h.strikeAround(sim, 2.4, 0.9, 16 * h.power(), 0, 4, { kind: 'bash', poise: 80, stun: 1.0, shove: 5 });
      for (const k of sim.heroWorld.targets) if (fightable(k) && Math.hypot(k.x - h.x, k.z - h.z) < 3.5) { k.tauntBy = h; k.tauntT = sim.time + 5; }
      if (h.fxOk()) { const f = h.ahead(1.1); sim.casting.burst(FX.FLARE, ELEM.STORM, f[0], f[1], f[2], 0.5, 1.4, 0.18, { light: 10, lightR: 5 }); }
    }, { lunge: 2.4, bash: h.style === 'lance', from: 0.2 });
    h.iframesT = 0.35;
  }

  // The healer's light, on whoever of you the crosshair's on (or the lowest of you, if it's on none of you).
  mendLight(h) {
    const sim = this.sim, w = sim.heroWorld, inp = sim.input, yaw = inp[INPUT.YAW];
    let who = null, bs = 0.5;
    for (const o of w.company.members) {
      if (o.dead) continue;
      const a = Math.abs(wrapAngle(Math.atan2(o.x - h.x, o.z - h.z) - yaw));
      if (o !== h && Math.hypot(o.x - h.x, o.z - h.z) < 24 && a < bs) { bs = a; who = o; }
    }
    if (!who) { let low = 2; for (const o of w.company.members) if (!o.dead && o.hp / o.maxHp < low) { low = o.hp / o.maxHp; who = o; } }
    if (!who) who = h;
    const lvl = 1 + h.person.level * 0.04;
    h.startSwing('Spell_Simple_Shoot', 1.3, [0.45], () => {
      if (who.dead) return;
      who.hp = Math.min(who.maxHp, who.hp + (0.3 * who.maxHp + 12 * lvl) * (1 + (h.mods?.grace || 0)));
      sim.casting.burst(FX.COLUMN, ELEM.LIGHT, who.x, who.y, who.z, 0.6, 1.1, 1.0, { light: 14, lightR: 6, len: 3 });
      sim.casting.burst(FX.RING, ELEM.LIGHT, who.x, who.y + 0.05, who.z, 0.3, 1.3, 0.6);
    }, { mask: 'upper' });
  }

  // A bard's song, for the whole party, as the AI sings it (HeroWorld.care), at a word.
  song(h, key) {
    const sim = this.sim, w = sim.heroWorld, members = [...w.company.members];
    const elem = key === 'war_song' ? ELEM.FIRE : key === 'marching_song' ? ELEM.STORM : ELEM.HEAL;
    if (h.luteP) h.playLute(key === 'marching_song' ? 5 : 3.2, key === 'war_song' ? 2 : key === 'marching_song' ? 0 : 1, { elem });
    h.startSwing('LP_sing_01', 1, [0.1], () => {
      w.zones.push({ kind: 'song', owner: h, members, x: h.x, z: h.z, t: 0, life: 6, elem, heal: key === 'mending_song' });
      if (key !== 'mending_song') for (const o of members) { o.buff = { ...(o.buff || {}), ...(key === 'war_song' ? { dmg: 1.25 } : { speed: 1.25 }) }; o.buffT = Math.max(o.buffT, 20); }
    }, { mask: 'upper', end: 0.25 });
  }

  // ---- the party's four calls --------------------------------------------------------------------------------------

  order(kind) {
    const sim = this.sim, w = sim.heroWorld;
    if (!w || !CALLS.includes(kind)) return;
    const p = sim.player;
    const foe = kind === 'go' ? (this.h ? this.target : this.aimFromPlayer()) : null;
    this.call = { kind, t: CALL_FOR[kind], foe: foe && fightable(foe) ? foe : null, x: p.x, z: p.z };
    w.call = this.call;
    for (const o of w.company.members) {
      if (o === this.h || o.dead) continue;
      o.waitAt = kind === 'wait' ? [o.x, o.z] : null;
      if (kind === 'go' && this.call.foe) { o.foe = this.call.foe; }
    }
    this.say(`call_${kind}`, -1);
  }

  // What you're looking at, as yourself (the call Go with no hero of yours to see by).
  aimFromPlayer() {
    const sim = this.sim, p = sim.player, yaw = p.yaw;
    let best = null, bs = 0.45;
    for (const m of sim.heroWorld.targets) {
      if (!fightable(m)) continue;
      const d = Math.hypot(m.x - p.x, m.z - p.z);
      if (d > 40) continue;
      const a = Math.abs(wrapAngle(Math.atan2(m.x - p.x, m.z - p.z) - yaw)) + d * 0.004;
      if (a < bs) { bs = a; best = m; }
    }
    return best;
  }

  step(dt) {
    const c = this.call;
    if (c && (c.t -= dt) <= 0) { this.call = null; if (this.sim.heroWorld) this.sim.heroWorld.call = null; for (const o of this.sim.heroWorld?.company.members || []) o.waitAt = null; }
  }

  // ---- what the render thread sees: H.PLAY ---------------------------------------------------------------------------
  write(snap) {
    const o = H.PLAY, h = this.h, sim = this.sim;
    snap[o] = h ? h.slot + 1 : 0;
    let ti = -1;
    if (h && this.target) { const k = sim.knights.indexOf(this.target); ti = k; }
    snap[o + 1] = ti;
    snap[o + 2] = h && this.chain ? (this.bar.includes(this.chain.key) ? this.bar.indexOf(this.chain.key) + 1 : 101) : 0;
    snap[o + 3] = h && this.chain ? this.chain.t / CHAIN_FOR : 0;
    snap[o + 4] = h?.playBlock ? 1 : 0;
    snap[o + 5] = Math.max(0, this.evadeCd) / EVADE_CD;
    snap[o + 6] = this.call ? CALLS.indexOf(this.call.kind) + 1 : 0;
    snap[o + 7] = this.auto ? 1 : 0;
    for (let i = 0; i < BAR_SLOTS; i++) snap[o + 8 + i] = this.cds[i];
    snap[o + 18] = h && this.chain && !this.bar.includes(this.chain.key) ? MOVE_KEYS.indexOf(this.chain.key) : -1;
    snap[o + 19] = h ? h.hp / h.maxHp : 0;
  }
}
