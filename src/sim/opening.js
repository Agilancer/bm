// The opening, as the sim plays it: where Lisandra stands and what she does, when you can move, the cave falling in, and
// the walk down to town. The camera, the words and the sound follow the same clock (src/ui/opening.js).
import { CUES, CUE_IDS } from '../core/opening-script.js';
import {
  CAVE_LINE, CAVE_MOUTH, CHAMBER_AXIS, COLLAPSE_END, DUST_AT, KNEEL_UP, collapseEye, HERD_CONTROL, HERD_END, NAME_AT, OPENING,
  OPENING_SPAWN, OPENING_YAW, PORTAL, SWAP_AT, TIDY_MARK, TUNNEL_LEN, WEAVE, WITCH_MARK, WITCH_STOP, caveNearest, chamberPoint, storyHolds,
} from '../core/opening.js';
import { DIVE_TO, ROUTE, STORM_TO, VIEW_SPOT, routeAt, routeDir, routeNear } from '../core/escort.js';
import { clamp } from '../core/math.js';
import { ambush } from './undead.js';

const WEAVE_FROM = 16.3;            // into WAKE: she starts toward you as the candles catch
const LEAVE_PACE = 2.4;             // how fast you can go in the cave, until you're out
const KNEEL_TURN = 0.35;     // how far round from facing you she comes down
const AWAY_TURN = 0.8;       // turned to the rubble, how far round toward you she stays (three-quarters from behind)
// Hands put somewhere, in her body's space (x to her left, y up, z ahead): src/sim/village-walker.js act's b.reach.
const GUARD = [['L', [0.16, 1.0, 0.3], null], ['R', [-0.16, 1.02, 0.3], null]];
const PALMS_UP = [['L', [0.12, 1.06, 0.32], 'up'], ['R', [-0.12, 1.06, 0.32], 'up']];
// (Her right palm braced on her raised knee: the kneel's too upright for a hand to reach the ground without folding her up.)
const KNEE_HAND = [['R', 'LeftLeg', 'down']];
const ASIDE = chamberPoint(10.1, 2.0);
const PORTAL_XZ = [PORTAL[0], PORTAL[2]];
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
// Where she starts her run, out of sight down the tunnel, when the portal dies.
const RUN_FROM = (() => { const p = CAVE_LINE.find((q) => q[4] >= 15); return [p[0], p[1]]; })();

// Where on the road down (src/core/escort.js) things happen, as distances along it.
const MARKS = { bend: 46, ambush: routeNear(-214, 180), sight: routeNear(-84, 63) };
MARKS.woods = MARKS.ambush - 34;
MARKS.half = ROUTE.len * 0.6;

// How she leads you down: this far ahead of you on foot, and further on a shield, where it's fast. Come up on her back and
// she hurries; fall back past FAR and she stops and waits for you. With you stood still she strolls on ahead to there.
const LEAD = 5.5, LEAD_RIDE = 9, FAR = 14, STROLL = 1.5;
const FOOT_MAX = 9.6;        // flat out on foot: a little over your sprint, so she can always get back in front
const RIDE_MAX = 30;         // on the shield: over what yours can do
const OFF_AT = 5.5;          // you're off yours, and she's slowed to this: she steps off hers
const RIDE_LIFT = 0.16;      // her soles over the ground, stood on the board (its face 0.09 up: src/items/drops.js boardPose)
const HOP = 0.32;            // s: the little jump on and off it
// Her walk, jog and run, by pace: the jog kept on longer than in the cave, so keeping ahead of your walk is a quick jog.
const GAITS = [2.2, 6.6];
// What she says on the road (CUES in src/core/opening-script.js): one line at a time, TALK_GAP s between, each waiting till
// you're within HEAR of her (calls don't). Between the lines a place on the road brings, these, in turn: the hill's while
// she's still above the pines, the low road's once the dead in them are down.
const TALK_GAP = 1.1, HEAR = 17;
const HILL = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'];
const LOW = ['low1', 'low2', 'low3', 'low4', 'low5', 'low6'];
const KEEP = ['keep1', 'keep2', 'keep3'];
const ROAD_TALK = new Set([...HILL, ...LOW, 'lead', 'bend', 'bend2', 'woods']);

export class Opening {
  constructor(sim) {
    this.sim = sim;
    // Her weave across the chamber, from the candle wave, at a pace that brings her to you as she finishes her piece,
    // with two pauses.
    let d = 0;
    for (let i = 1; i < WEAVE.length; i++) d += Math.hypot(WEAVE[i][0] - WEAVE[i - 1][0], WEAVE[i][1] - WEAVE[i - 1][1]);
    this.weavePace = d / (34.6 - WEAVE_FROM - 4.0);
    this.reset();
  }

  reset() {
    this.setStage(OPENING.WAKE);
    const { player, world } = this.sim;
    [player.x, player.z] = OPENING_SPAWN;
    player.y = world.height(player.x, player.z);
    player.yaw = OPENING_YAW;
    player.vx = player.vz = player.vy = 0;
    for (const v of this.sim.villagers) {
      [v.x, v.z] = WITCH_MARK;
      v.yaw = yawTo(WITCH_MARK, OPENING_SPAWN);
      v.y = world.height(v.x, v.z);
      v.cloth?.reset();
    }
  }

  setStage(stage) {
    this.stage = stage;
    this.time = 0;
    this.cue = 0; this.cueT = 0;
    this.fired = new Set();
    this.weaveI = 1; this.pauseLeft = 0;
    this.back = 0; this.deepest = 1e9; this.towardT = 0;
    this.prog = 0; this.pace = 0; this.ambushed = null; this.ambushDone = false; this.aheadT = 0; this.slowAt = undefined;
    this.endT = -1; this.fellT = undefined;
    // On the road: what she's yet to say, how long till she can say the next, and how long she's stood waiting for you.
    this.queued = []; this.talkLeft = 0; this.waitT = 0; this.keepAt = -99; this.keepN = 0;
    this.then = null; this.arrived = false; this.marked = new Set();
    // On a shield: whether, for how long, since when (the hop on or off), and which foot leads.
    this.riding = false; this.rideT = 0; this.hopT = 9; this.rode = false;
    this.sim.paceCap = stage === OPENING.HERD || stage === OPENING.LEAVE ? LEAVE_PACE : undefined;
    // (The rubble is down from partway into COLLAPSE: see collapse.)
    this.sim.world.setCaveSealed(stage > OPENING.COLLAPSE);
  }

  // A line said when something happens (CUES in src/core/opening-script.js), once.
  say(id) {
    if (this.fired.has(id)) return false;
    this.speak(id);
    return true;
  }

  // Said now, whatever's up, and the next waits for it to finish.
  speak(id) {
    this.fired.add(id);
    this.cue = CUE_IDS.indexOf(id) + 1;
    this.cueT = 0;
    this.talkLeft = CUES[id].dur + TALK_GAP;
  }

  // Next on the road, once she's done with what she's saying (first: ahead of whatever else is waiting). Said once.
  queue(id, first = false) {
    if (this.fired.has(id) || this.queued.includes(id)) return;
    if (first) this.queued.unshift(id); else this.queued.push(id);
  }

  // You can't move while the story has the camera.
  frozen() {
    return storyHolds(this.stage, this.time);
  }

  // Your name's given: on with it.
  named() {
    if (this.stage === OPENING.NAME) this.setStage(OPENING.HERD);
  }

  // Held to skip: Act I to the name; the rest of it, and the ledge, to the start of the walk down.
  skip() {
    const { player, world, villagers } = this.sim;
    const put = ([x, z]) => { for (const v of villagers) { v.x = x; v.z = z; v.y = world.height(x, z); v.yaw = yawTo([x, z], [player.x, player.z]); v.cloth?.reset(); } };
    if (this.stage === OPENING.WAKE) {
      this.setStage(OPENING.NAME);
      put(WITCH_STOP);
    } else if (this.stage >= OPENING.HERD && this.stage <= OPENING.COLLAPSE) {
      this.setStage(OPENING.ESCORT);
      [player.x, player.z] = VIEW_SPOT;
      player.y = world.height(player.x, player.z);
      player.vx = player.vz = player.vy = 0;
      put(routeAt(0));
    }
  }

  // On the road down you can't die: you're knocked flat, and come to on the road beside her.
  catchFall(player) {
    if (this.stage !== OPENING.ESCORT && this.stage !== OPENING.ARRIVED) return false;
    const w = this.sim.villagers[1];
    player.hp = Math.max(1, Math.round(player.maxHp * 0.5));
    player.x = w.x + Math.cos(w.yaw) * 1.6; player.z = w.z - Math.sin(w.yaw) * 1.6;
    player.y = this.sim.world.height(player.x, player.z);
    player.vx = player.vz = player.vy = 0;
    player.knockX = player.knockZ = 0;
    this.fellT = this.time;
    return true;
  }

  update(dt) {
    const { player, world, villagers } = this.sim;
    this.time += dt;
    this.cueT += dt;
    const t = this.time;
    const w = villagers[1];
    const you = [player.x, player.z];
    const eye = [player.x, player.y + 1.5, player.z];
    let b;
    switch (this.stage) {
      case OPENING.WAKE:
        b = this.wake(t, dt, w, you, eye);
        if (t >= NAME_AT) this.setStage(OPENING.NAME);
        break;
      case OPENING.NAME:
        // Arms folded, then a foot tapping.
        b = { clip: t < 1.2 ? 'Idle_FoldArms_Loop' : 'wait', face: yawTo([w.x, w.z], you), look: eye };
        break;
      case OPENING.HERD: {
        const tunnel = chamberPoint(0, 0);
        if (t < 4.3) b = { clip: t > 0.3 && t < 2.4 ? 'agree' : 'idle', face: yawTo([w.x, w.z], you), look: eye };
        else if (t < 6.4) b = { clip: 'Pointing into the distance', face: yawTo([w.x, w.z], tunnel), look: [tunnel[0], 58.5, tunnel[1]] };
        else if (t < HERD_CONTROL) b = { to: ASIDE, speed: 1.3, clip: 'complain_01', face: yawTo(ASIDE, tunnel), look: eye };
        else b = { to: TIDY_MARK, speed: 1.2, clip: 'Interact', rate: 0.7, face: yawTo(TIDY_MARK, PORTAL_XZ) };
        if (t >= HERD_END) this.setStage(OPENING.LEAVE);
        break;
      }
      case OPENING.LEAVE:
        b = this.leaving(dt, w, you, eye);
        break;
      case OPENING.COLLAPSE:
        b = this.collapse(t, dt, w, you, eye);
        if (t >= COLLAPSE_END) { this.setStage(OPENING.ESCORT); this.prog = routeNear(w.x, w.z, 0, 20); }
        break;
      case OPENING.ESCORT:
        b = this.escort(dt, w, you, eye);
        break;
      default:
        b = { clip: 'idle', face: yawTo([w.x, w.z], you), look: eye };
    }
    // (A pose held for testing: bm.pose in src/main.js.)
    if (this.pose) {
      b = this.pose;
      if (b.at) { [w.x, w.z] = b.at; b.at = null; }
    }
    // Both of her (the witch, and the face only you see) do the same from the same place.
    const p = villagers[0];
    if (p !== w) { p.x = w.x; p.z = w.z; p.yaw = w.yaw; }
    for (const v of villagers) v.act(dt, world, b);
    if (p !== w) { p.x = w.x; p.z = w.z; p.y = w.y; p.yaw = w.yaw; }
  }

  // ---- Act I, to the name ------------------------------------------------------------------------------------------------
  wake(t, dt, w, you, eye) {
    const face = yawTo(WITCH_MARK, you);
    const book = [w.x + Math.sin(w.yaw + 0.5) * 0.45, w.y + 1.15, w.z + Math.cos(w.yaw + 0.5) * 0.45];
    if (t < 6.0) return { clip: 'Spell_Simple_Idle_Loop', face, look: book };
    if (t < 6.9) return { clip: 'idle', face, look: eye };
    // Her hand held out to you as your eyes come open, square on; the witch is caught in the same pose.
    // The witch is caught in it too, square on, her hand still held out to you, for a long breath after the flash.
    if (t < SWAP_AT + 0.85) return { clip: 'Interact', hold: 1.05, rate: 0.8, face, look: eye, blend: 3, tremble: t > SWAP_AT + 0.4 };
    if (t < SWAP_AT + 1.25) {
      // Then two quick steps back, her hands up, as startled as you.
      const back = [WITCH_MARK[0] - Math.sin(face) * 0.7, WITCH_MARK[1] - Math.cos(face) * 0.7];
      return { to: back, speed: 1.8, keepFace: true, face, clip: 'frightened', from: 0.25, hold: 0.6, look: eye, tremble: true, blend: 12, reach: GUARD };
    }
    if (t < 11.0) return { clip: 'frightened', hold: 0.6, face, look: eye, tremble: true, reach: GUARD };
    if (t < 12.1) return { clip: 'frightened', hold: 0.6, face, look: PORTAL, whip: true, tremble: true, reach: GUARD };
    // "Oh, no.": her hands come up open before her, palms up, and she looks down into them, old; then up at you.
    const hands = [w.x + Math.sin(face) * 0.36, w.y + 1.0, w.z + Math.cos(face) * 0.36];
    if (t < 14.3) return { clip: 'complain_01', from: 1.7, rate: 0.45, hold: 2.3, face, look: t < 13.35 ? hands : eye, blend: 4, reach: t < 13.9 ? PALMS_UP : null };
    if (t < 15.5) return { clip: 'Spell_Simple_Shoot', face, look: eye, snap: t - 14.3, rate: 0.55, blend: 10 };
    if (t < WEAVE_FROM) return { clip: 'idle', face, look: [w.x + Math.sin(face) * 3, w.y + 3.5, w.z + Math.cos(face) * 3] };
    if (t < 34.6) return this.weave(t, dt, w, you, eye);
    return { clip: t < 37.7 ? 'idle' : 'Idle_Talking_Loop', face: yawTo([w.x, w.z], you), look: eye };
  }

  // She comes toward you through her clutter, stopping twice, glancing at the portal when it hitches.
  weave(t, dt, w, you, eye) {
    const glance = [21.8, 27.6, 32.3].some((g) => t > g && t < g + 1.1);
    const look = glance ? PORTAL : eye;
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dt;
      return { clip: 'idle', face: yawTo([w.x, w.z], you), look };
    }
    const to = WEAVE[Math.min(this.weaveI, WEAVE.length - 1)];
    if (Math.hypot(to[0] - w.x, to[1] - w.z) < 0.05) {
      if (this.weaveI >= WEAVE.length - 1) return { clip: 'idle', face: yawTo([w.x, w.z], you), look };
      if (this.weaveI === 2 || this.weaveI === 4) this.pauseLeft = 2.0;
      this.weaveI++;
    }
    return { to, speed: this.weavePace, look, face: yawTo([w.x, w.z], you) };
  }

  // ---- walking out ------------------------------------------------------------------------------------------------------
  leaving(dt, w, you, eye) {
    const { player } = this.sim;
    const n = caveNearest(player.x, player.z);
    const s = n.s, inChamber = n.chamber >= 0;
    const tidy = { to: TIDY_MARK, speed: 1.2, clip: 'Interact', rate: 0.7, face: yawTo(TIDY_MARK, PORTAL_XZ) };
    if (s >= 0) this.deepest = Math.min(this.deepest, s);
    // Turned back into the chamber: she steps between you and the portal and shoos you out.
    const toward = player.vx * CHAMBER_AXIS[0] + player.vz * CHAMBER_AXIS[1];
    this.towardT = inChamber && toward > 0.6 && s > this.deepest + 1.2 ? this.towardT + dt : Math.max(0, this.towardT - dt);
    if (this.towardT > 0.35) { this.say('back'); this.back = 1; }
    if (this.back && Math.hypot(w.x - player.x, w.z - player.z) < 2.3 && this.towardT > 0.35) this.say('back2');
    if (this.back && toward < 0.2) this.back = Math.max(0, this.back - dt / 3);
    if (s > 0 && s < TUNNEL_LEN - 3) this.say('tunnel');
    if (s < -2.6 || (s < 0 && Math.hypot(player.x - CAVE_MOUTH[0], player.z - CAVE_MOUTH[1]) > 2.8)) {
      this.setStage(OPENING.COLLAPSE);
      return tidy;
    }
    if (this.back > 0) {
      const block = [player.x + CHAMBER_AXIS[0] * 1.7, player.z + CHAMBER_AXIS[1] * 1.7];
      return { to: block, speed: 2.4, clip: this.fired.has('back2') ? 'Talking to someone angrily' : 'complain_02', face: yawTo([w.x, w.z], you), look: eye };
    }
    return tidy;
  }

  // ---- Act II: the ledge, the cave-in, her face ----------------------------------------------------------------------------
  collapse(t, dt, w, you, eye) {
    const { player, world } = this.sim;
    // A few steps out to the edge of the ledge, taking in the valley.
    if (t < 2.6) {
      const k = Math.min(1, dt / Math.max(0.05, 2.6 - t + dt));
      player.x += (VIEW_SPOT[0] - player.x) * k; player.z += (VIEW_SPOT[1] - player.z) * k;
      player.y = world.height(player.x, player.z);
    }
    const outward = yawTo(CAVE_MOUTH, VIEW_SPOT), face = yawTo([w.x, w.z], you);
    if (t < 4.4) {
      // Out of sight down the tunnel, as the portal dies.
      if (Math.hypot(w.x - RUN_FROM[0], w.z - RUN_FROM[1]) > 0.5) { [w.x, w.z] = RUN_FROM; w.yaw = outward; }
      return { clip: t < 3.0 ? 'Interact' : 'scared_02', face: outward };
    }
    if (t < DUST_AT) {
      // Down the tunnel to the mouth, flat out.
      const n = caveNearest(w.x, w.z);
      const ahead = CAVE_LINE[Math.max(0, n.i - 3)];
      return { to: n.s > 1 ? [ahead[0], ahead[1]] : CAVE_MOUTH, speed: 6.0, turn: 14 };
    }
    // Out of the dust at a run, and down onto one knee, a hand braced on the other knee and the book held to her; she gets
    // her breath, looks back at what was her home, then up at you, and gets up.
    if (t < DUST_AT + 0.3) return { to: DIVE_TO, speed: 6.0, turn: 14 };
    if (t > DUST_AT + 0.6) world.setCaveSealed(true);
    // (Down three-quarter on to you, the knee on the ground the near one.)
    const kneel = outward + KNEEL_TURN, low = [eye[0], player.y + collapseEye(t), eye[2]];
    if (t < DUST_AT + 0.75) return { to: DIVE_TO, speed: 3.0, clip: 'fall', from: 0.72, rate: 0.9, hold: 1.02, face: kneel, turn: 6, blend: 10 };
    const home = [CAVE_MOUTH[0], w.y + 1.2, CAVE_MOUTH[1]];
    if (t < 9.5) return { clip: 'Farm_PlantSeed', from: 0.55, rate: 0.75, hold: 1.42, face: kneel, turn: 2, blend: 6, heave: true, reach: t > DUST_AT + 0.95 ? KNEE_HAND : null, look: home };
    if (t < KNEEL_UP) return { clip: 'Farm_PlantSeed', rate: 0.66, hold: 1.95, face: kneel, look: low, heave: true };
    if (t < 11.4) return { clip: 'Farm_PlantSeed', rate: 0.85, face, turn: 3, look: low };
    if (t < 12.0) return { clip: 'idle', face, look: low, blend: 4 };
    // "WHAT HAVE YOU DONE?!": fists, a step at you with her finger stabbing at your face, leaning into it; then both fists
    // driven down at her sides.
    if (t < 12.45) return { to: STORM_TO, speed: 1.7, face, look: low, fists: true };
    if (t < 13.45) return { clip: 'angry_02', from: 0.25, rate: 0.25, hold: 0.4, face, look: low, point: low, fists: true, lean: 0.22, blend: 8 };
    if (t < 14.6) return { clip: 'angry_02', rate: 0.9, hold: 1.3, face, look: low, fists: true, lean: 0.16, blend: 6 };
    if (t < 15.2) return { clip: 'idle', face, look: eye };
    const rubble = yawTo([w.x, w.z], CAVE_MOUTH);
    const side = Math.sin(face - rubble) >= 0 ? 1 : -1, away = rubble + side * AWAY_TURN, off = rubble + side * AWAY_TURN * 1.6;
    const past = [w.x + Math.sin(off) * 3, w.y + 1.0, w.z + Math.cos(off) * 3];
    if (t < 21.2) return { clip: t < 18 ? 'idle' : 'depressed', face: away, turn: 3, look: past };
    if (t < 26.8) return { clip: t < 22.2 ? 'Idle_FoldArms_Loop' : 'wait', face, look: eye, turn: 4 };
    if (t < 27.9) return { clip: 'cry', face, rate: 1.4, hold: 1.4 };
    if (t < 29.4) return { clip: 'hug', face, hold: 0.95, look: eye };
    if (t < 32.4) return { clip: 'depressed', face: away, turn: 3, look: past };
    if (t < 34.3) return { clip: 'idle', face, look: eye, turn: 4 };
    const down = routeAt(40);
    if (t < 37.8) return { clip: 'Pointing into the distance', face: yawTo([w.x, w.z], down), look: [down[0], 40, down[1]] };
    return { clip: 'Idle_Talking_Loop', face, look: eye };
  }

  // ---- Act III: the walk down ---------------------------------------------------------------------------------------------
  // She leads you down to Bellmourn: out ahead of you on the road, at your pace, talking the whole way. Fall back and she
  // waits for you; come up on her back and she hurries on; ride your shield and she rides one too, so you never get past.
  escort(dt, w, you, eye) {
    const { player } = this.sim;
    // Where you are along the road (looked for near her), how fast you're coming down it, and how far ahead she is.
    const mine = routeNear(player.x, player.z, this.prog);
    const [rx, rz] = routeDir(mine);
    const along = player.vx * rx + player.vz * rz;
    const gap = this.prog - mine;
    const far = Math.hypot(player.x - w.x, player.z - w.z);
    this.hopT += dt;
    if (this.time > 0.4) this.mark('lead');
    // Run on past her and she calls after you.
    this.aheadT = -gap > 28 && !(this.ambushed && !this.ambushDone) ? this.aheadT + dt : 0;
    if (this.aheadT > 1.2) {
      if (!this.fired.has('slow')) { this.queue('slow', true); this.slowAt = this.time; } else if (this.time - this.slowAt > 16) this.queue('wait', true);
    }
    this.talk(dt, far < HEAR);
    // The ambush, in the pines at the woods' edge: on foot she gets down and leaves it to you; on a shield she rides on
    // through, out ahead of you still.
    if (!this.ambushDone && this.prog >= MARKS.ambush) {
      if (!this.ambushed) {
        const [ax, az] = routeAt(this.prog + 16), [hx, hz] = routeAt(this.prog + 17);
        const dx = hx - ax, dz = hz - az, l = Math.hypot(dx, dz) || 1, side = Math.random() < 0.5 ? 1 : -1;
        this.ambushed = ambush(this.sim, ax - dz / l * 9 * side, az + dx / l * 9 * side, 3);
        this.ambushT = this.time;
        if (!this.ambushed.length) this.ambushDone = true;
        else this.queue('risen', true);
      }
      const left = this.ambushed.filter((k) => !k.dead).length;
      if (left && this.time - this.ambushT > 7) this.queue('fight', true);
      if (!this.ambushDone && (!left || this.time - this.ambushT > 80)) { this.ambushDone = true; this.queue('after', true); }
      if (!this.ambushDone && !this.riding) {
        this.pace = 0;
        return { clip: 'Crouch_Idle_Loop', face: yawTo([w.x, w.z], you), look: eye, lift: this.hopLift() };
      }
    }
    // On a shield when you get on yours; off it once you're off yours and she's slowed, or at the road's end.
    if (player.surfing && !this.riding && this.prog < ROUTE.len - 20) this.getOn();
    else if (this.riding && ((!player.surfing && this.pace < OFF_AT) || this.prog >= ROUTE.len - 1)) this.getOff();
    if (this.riding) {
      this.rideT += dt;
      this.fastT = this.pace > 15 ? (this.fastT || 0) + dt : 0;
      if (this.fastT > 1) this.queue('fast', true);
    }
    // Her lead kept on you at your own pace; with you stood still, a stroll on ahead; far enough ahead, or with you gone off
    // somewhere else, she stops and waits.
    let want = along + ((this.riding ? LEAD_RIDE : LEAD) - gap) * (this.riding ? 1.2 : 1.4);
    if (gap < FAR && !this.riding) want = Math.max(want, STROLL);
    if (far > 30) want = 0;
    want = clamp(want, 0, this.riding ? RIDE_MAX : FOOT_MAX);
    this.pace += (want - this.pace) * Math.min(1, dt * (this.riding ? 2.5 : 3));
    if (this.prog >= ROUTE.len - 0.3) this.pace = 0;
    this.prog = Math.min(ROUTE.len, this.prog + this.pace * dt);
    const to = routeAt(this.prog);
    // Stood waiting for you: after a moment, she calls you on (again now and then, if you're still dawdling).
    const waiting = this.pace < 0.3 && !this.riding && (gap > FAR - 1.5 || far > 30);
    this.waitT = waiting && along < 1 ? this.waitT + dt : 0;
    if (this.waitT > 2.5 && this.time - this.keepAt > 10) {
      const id = KEEP[this.keepN++ % KEEP.length];
      this.fired.delete(id);
      this.queue(id, true);
      this.keepAt = this.time;
    }
    // Lines that wait for a place on the road.
    if (this.prog > MARKS.bend) this.mark('bend');
    if (this.prog > MARKS.woods && !this.ambushed) this.mark('woods');
    if (this.prog > MARKS.half && this.ambushDone) this.mark('half');
    if (this.prog > MARKS.sight) this.mark('sight');
    // At the town's edge, with you there too (or on into town past her): once she's done talking, the scream.
    if (this.prog >= ROUTE.len - 0.3 && (far < 10 || mine > ROUTE.len - 2) && !this.arrived) {
      this.arrived = true;
      this.queued = this.queued.filter((id) => !ROAD_TALK.has(id));
    }
    if (this.arrived && this.endT < 0 && this.talkLeft <= 0 && !this.queued.length && !this.then) { this.speak('scream'); this.endT = this.time; }
    if (this.endT >= 0) {
      if (this.time - this.endT > 1.9) this.say('walk');
      if (this.time - this.endT > 3.8) this.setStage(OPENING.ARRIVED);
    }
    // Talking, she looks back at you over her shoulder.
    const talking = this.cue && this.cueT < CUES[CUE_IDS[this.cue - 1]].dur;
    const look = talking || gap < 0 || far > 9 ? eye : null;
    if (this.riding) {
      // Side-on on the board, left foot leading, crouched, her eyes going between the road and you.
      const [tx, tz] = routeDir(this.prog);
      return { to, speed: Math.max(this.pace, Math.hypot(to[0] - w.x, to[1] - w.z) / Math.max(dt, 1e-3)), pace: this.pace, keepFace: true,
        face: Math.atan2(tx, tz) - Math.PI / 2, turn: 12, clip: 'Crouch_Idle_Loop', lift: RIDE_LIFT + this.hopLift(), look: talking ? eye : null };
    }
    if (this.pace < 0.25 && Math.hypot(to[0] - w.x, to[1] - w.z) < 0.3) {
      return { clip: this.waitT > 3 ? 'wait' : 'idle', face: yawTo([w.x, w.z], you), look: eye, lift: this.hopLift() };
    }
    // (Put on the road outright: she follows it, the trees stand clear of it, and nothing turns her aside.)
    return { to, speed: Math.max(this.pace, Math.hypot(to[0] - w.x, to[1] - w.z) / Math.max(dt, 1e-3)), pace: this.pace, look, gaits: GAITS, lift: this.hopLift() };
  }

  // A line a place on the road brings on: next up, once.
  mark(id) {
    if (this.marked.has(id)) return;
    this.marked.add(id);
    this.queue(id, true);
  }

  // Onto a shield, and off it: a little hop either way.
  getOn() {
    this.riding = true; this.rideT = 0; this.hopT = 0; this.fastT = 0;
    if (!this.rode) { this.rode = true; this.queue('board', true); }
  }

  getOff() {
    this.riding = false; this.hopT = 0;
    this.queued = this.queued.filter((id) => id !== 'board' && id !== 'fast');
    if (this.rideT > 3 && this.fired.has('board')) this.queue('off');
  }

  hopLift() { return this.hopT < HOP ? Math.sin(Math.PI * this.hopT / HOP) * 0.3 : 0; }

  // Her lines on the road: the next once she's done with the last and you're near enough to hear it (or it's called back to
  // you). Between the lines a place brings on, the stretch's own talk, in turn.
  talk(dt, near) {
    this.talkLeft -= dt;
    // (Overtaken by the road: the hill's talk, and the warning, once the dead are up; the fight's once it's over.)
    if (this.ambushed) this.queued = this.queued.filter((id) => !HILL.includes(id) && id !== 'lead' && id !== 'bend' && id !== 'bend2' && id !== 'woods');
    if (this.ambushDone) this.queued = this.queued.filter((id) => id !== 'risen' && id !== 'fight');
    if (this.talkLeft > 0) return;
    if (!this.queued.length && near && !this.arrived && this.fired.has('lead')) {
      const run = this.ambushDone ? LOW : !this.ambushed ? HILL : null;
      const next = run?.find((id) => !this.fired.has(id));
      if (next) this.queued.push(next);
    }
    // (Some lines run straight on into the next. At the town's edge she says what's left wherever you are.)
    if (this.then) { this.speak(this.then); this.then = null; return; }
    const i = this.queued.findIndex((id) => near || this.arrived || CUES[id].call);
    if (i < 0) return;
    const [id] = this.queued.splice(i, 1);
    this.speak(id);
    this.then = { bend: 'bend2', half: 'half2' }[id] || null;
  }

  write(snap, H) {
    snap[H.OPENING] = this.stage;
    snap[H.OPENING_TIME] = this.time;
    snap[H.OPENING_NEXT] = this.prog;
    snap[H.OPENING_CUE] = this.cue;
    snap[H.OPENING_CUE_T] = this.cueT;
    snap[H.OPENING_FELL] = this.fellT !== undefined ? this.time - this.fellT : 99;
    snap[H.OPENING_RIDE] = this.riding ? 1 : 0;
  }

  // A saved game (src/ui/opening.js save: the stage, her place and how far down the road, your name), picked up where it can
  // be: the cave scenes start again from the top, and the ledge from the start of the walk down.
  restore(d) {
    const { player, world, villagers } = this.sim;
    let stage = d.opening;
    if (stage <= OPENING.NAME && !d.name) stage = OPENING.WAKE;
    else if (stage <= OPENING.HERD) stage = OPENING.LEAVE;
    else if (stage === OPENING.COLLAPSE) stage = OPENING.ESCORT;
    if (stage === OPENING.WAKE) { this.reset(); return; }
    this.setStage(stage);
    const w = villagers[1];
    if (stage === OPENING.LEAVE) {
      [w.x, w.z] = TIDY_MARK;
    } else {
      const prog = d.opening === OPENING.COLLAPSE ? 0 : d.guide?.[3] ?? 0;
      this.prog = stage === OPENING.ARRIVED ? ROUTE.len : clamp(prog, 0, ROUTE.len);
      [w.x, w.z] = routeAt(this.prog);
      if (this.prog <= 0) { [player.x, player.z] = VIEW_SPOT; player.y = world.height(player.x, player.z); }
      this.ambushDone = this.prog > MARKS.ambush - 10;
      // (What she'd have said by there isn't said again.)
      if (this.prog > 0) this.fired.add('lead');
      for (const id of ['bend', 'woods', 'half', 'sight']) if (this.prog > MARKS[id]) this.fired.add(id);
      if (this.fired.has('bend')) this.fired.add('bend2');
      if (this.fired.has('half')) this.fired.add('half2');
      if (this.ambushDone) for (const id of [...HILL, 'woods', 'risen', 'fight', 'after']) this.fired.add(id);
      // (The low road's talk, about as far through as she'd be.)
      if (this.ambushDone) for (const id of LOW.slice(0, Math.floor(LOW.length * clamp((this.prog - MARKS.ambush) / (ROUTE.len - MARKS.ambush), 0, 1)))) this.fired.add(id);
    }
    for (const v of villagers) { v.x = w.x; v.z = w.z; v.y = world.height(w.x, w.z); v.yaw = yawTo([w.x, w.z], [player.x, player.z]); v.cloth?.reset(); }
  }
}
