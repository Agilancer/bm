// The opening, as the sim plays it: where Lisandra stands and what she does, when you can move, the cave falling in, and
// the walk down to town. The camera, the words and the sound follow the same clock (src/ui/opening.js).
import { CUES, CUE_IDS } from '../core/opening-script.js';
import {
  CAST_AT, CAVE, CAVE_LINE, CAVE_MOUTH, CHAMBER_AXIS, COLLAPSE_END, DOOR_SPOT, DUST_AT, FALL, FALL_FROM, FOLD_SPOT, HEARTH, HEARTH_SPOT, HERD, KNEEL_UP,
  LANTERN, LEAN_SPOT, LECTERN, OFFER_SPOT, PORTAL, ROUND_R, SEEN_SPOT, SNAP_AT, SNAP_SPOT, SPARK_AT, WAY, WAY_FOOT, WAY_HALF, WAY_HEAD, WRITE_SPOT, collapseEye, wakeEyeBack, wakeEyeH,
  HERD_END, NAME_AT, OPENING, OPENING_SPAWN, OPENING_YAW, SWAP_AT, TUNNEL_LEN, WEAVE, WITCH_MARK, WITCH_STOP,
  caveNearest, chamberPoint, storyHolds,
} from '../core/opening.js';
import { DIVE_TO, ROUTE, STORM_TO, VIEW_SPOT, cornerNear, routeAt, routeDir, routeNear } from '../core/escort.js';
import { EV, INPUT } from '../core/layout.js';
import { clamp, wrapAngle } from '../core/math.js';
import { ELEM, FX } from './spells.js';
import { CELL, TREE_FLOATS, treesInCells } from '../core/forest.js';
import { openingCaster, openingRaise } from './undead.js';

const WEAVE_FROM = 9.4;             // into WAKE: she sets off across the cave to you
const LEAVE_PACE = 2.4;             // how fast you can go in the cave, until you're out
const KNEEL_TURN = 0.35;     // how far round from facing you she comes down
const AWAY_TURN = 0.8;       // turned to the rubble, how far round toward you she stays (three-quarters from behind)
// Hands put somewhere, in her body's space (x to her left, y up, z ahead): src/sim/village-walker.js act's b.reach.
const GUARD = [['L', [0.16, 1.0, 0.3], null], ['R', [-0.16, 1.02, 0.3], null]];
const PALMS_UP = [['L', [0.12, 1.06, 0.32], 'up'], ['R', [-0.12, 1.06, 0.32], 'up']];
const HEART = [['R', [0.04, 1.25, 0.17], null]];
const CHEEK = [['R', [-0.08, 1.46, 0.13], null]];
// Both hands held out to her fire, palms down.
const WARM = [['L', [0.17, 0.98, 0.42], 'down'], ['R', [-0.17, 0.98, 0.42], 'down']];
// (Her right palm braced on her raised knee: the kneel's too upright for a hand to reach the ground without folding her up.)
const KNEE_HAND = [['R', 'LeftLeg', 'down']];
const yawTo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);
const off = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// Where she starts her run, out of sight down the tunnel, when the portal dies.
const RUN_FROM = (() => { const p = CAVE_LINE.find((q) => q[4] >= 15); return [p[0], p[1]]; })();
// Where she stands by her table, a hand on the old lantern.
const LANTERN_SPOT = (() => { const d = [HEARTH_SPOT[0] - HEARTH[0], HEARTH_SPOT[1] - HEARTH[1]], l = Math.hypot(...d); return [LANTERN[0] + d[0] / l * 0.75, LANTERN[2] + d[1] / l * 0.75]; })();

// Where on the way down (src/core/escort.js) things happen, as distances along it: the shelf, the head of the steps, a
// landing partway down them, the road, the pines, the dead, and the town in sight.
const MARKS = { shelf: 9, steps: routeNear(WAY[WAY_HEAD][0], WAY[WAY_HEAD][1]) - 4, speech: routeNear(WAY[WAY_HALF][0], WAY[WAY_HALF][1]), foot: routeNear(WAY.at(-1)[0], WAY.at(-1)[1]) - 8,
  stepsEnd: routeNear(WAY[WAY_FOOT][0], WAY[WAY_FOOT][1]), ambush: routeNear(-161.5, 134.3), sight: routeNear(-84, 63) };
MARKS.woods = MARKS.ambush - 34;
// (How far down the way the dead come up: auto-play is off its shield and on its feet well before it. src/ui/autobrain.js.)
export const AMBUSH_AT = MARKS.ambush;
// (How near the road you have to be, going by that mark, for them to come up: a little way off it to either side.)
const AMBUSH_NEAR = 30;
MARKS.star = MARKS.sight - 45;

// How she leads you down: this far ahead of you on foot, and further on a shield, where it's fast. Come up on her back and
// she hurries. Stop, and once she's a few steps on (HALT) she stops too, turns round and looks at you; she turns back and
// goes on when you've come up to within NEAR of her, or gone past. Fall back past FAR along the way, or go off more than
// WANDER from her, and she stops and waits the same.
const LEAD = 5.0, LEAD_RIDE = 9, HALT = 4.3, NEAR = 3.4, FAR = 9.5, WANDER = 16;
const FOOT_MAX = 9.6;        // flat out on foot: a little over your sprint, so she can always get back in front
const RIDE_MAX = 30;         // on the shield: over what yours can do
const OFF_AFTER = 1.2;        // s: or you've been off yours this long
const OFF_AT = 5.5;          // you're off yours, and she's slowed to this: she steps off hers
const RIDE_LIFT = 0.16;      // her soles over the ground, stood on the board (its face 0.09 up: src/items/drops.js boardPose)
const HOP = 0.32;            // s: the little jump on and off it
// Where her walk turns to a run, by pace (a touch later than in the cave). Her run is the one clip from there up, flat out
// included, quickened to her speed.
const GAITS = [2.2];
// What she says on the way (CUES in src/core/opening-script.js): one line at a time, TALK_GAP s between, each waiting till
// you're within HEAR of her (calls don't). Between the lines a place brings, these, in turn, while she's above the pines.
const TALK_GAP = 1.1, HEAR = 17;
const HILL = ['hill1', 'hill2', 'hill3', 'hill4', 'hill5'];
const LOW = ['low1', 'low2', 'low3', 'low4', 'low5'];
const KEEP = ['keep1', 'keep2', 'keep3'];
// After the fight, who Velscour was (for that you keep to her pace, HEAL_PACE), and what he was to her.
const HEAL = ['heal0', 'heal1', 'heal2', 'heal3', 'heal4', 'heal5', 'heal6'];
const WED = ['wed', 'wed2', 'wed3', 'wed4'];
const HEAL_PACE = 3.4;
// On her shelf and down her steps you keep to a walk behind her: it's narrow, and she has things to say on it.
const STEPS_PACE = 3.3, STEPS_STILL = 2.6;
const CORNER = { near: 1.6, pace: 1.15, gain: 1.4, give: 1.3 };
const THEN = { staff: 'staff2' };
// What's dropped unsaid at the town's edge, and what's dropped when the dead come up.
const ROAD_TALK = new Set([...HILL, ...LOW, 'lead', 'door', 'shelf', 'steps', 'speech', 'foot', 'staff', 'staff2', 'woods']);
const BEFORE_FIGHT = new Set([...HILL, 'lead', 'door', 'shelf', 'steps', 'speech', 'foot', 'staff', 'staff2', 'woods']);
// The fight on the road, a little below the pines, where the hillside is bare on both sides of it: twenty of the dead up
// out of the open ground either side, five at a time; when eight or fewer are left, twenty more and ten of their children;
// when ten or fewer of those are left, a necromancer out of the nearest trees past the bare ground on each side, who raise
// what's fallen. Nobody goes on down the road until every one of them is dead. All of them easy (src/sim/undead.js openingRaise). She fights it with
// you, with what fire she has left: a weak bolt every couple of seconds.
const WAVE = { first: 20, more: 20, children: 10, group: 5, every: 2.4, second: 8, third: 10, reach: 70, dry: 14, clear: 16, trees: 64 };
const HER_FIRE = { every: 1.9, range: 20, speed: 17, dmg: 5, at: 0.34 };

export class Opening {
  constructor(sim) {
    this.sim = sim;
    // Her way across the chamber to you before the flash, at a pace that brings her there for her last words.
    let d = 0;
    for (let i = 1; i < WEAVE.length; i++) d += Math.hypot(WEAVE[i][0] - WEAVE[i - 1][0], WEAVE[i][1] - WEAVE[i - 1][1]);
    this.weavePace = d / (SWAP_AT - 3.2 - WEAVE_FROM);
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
    // (Beat 8: the cast you're asked for, counted from the presses seen as it comes up.)
    this.castSeen = undefined;
    this.back = 0; this.deepest = 1e9; this.towardT = 0;
    this.prog = 0; this.pace = 0; this.ambushed = null; this.ambushDone = false; this.sprung = false; this.aheadT = 0; this.slowAt = undefined;
    this.endT = -1; this.fellT = undefined;
    // On the road: what she's yet to say, how long till she can say the next, and how long she's stood waiting for you.
    this.queued = []; this.talkLeft = 0; this.waitT = 0; this.keepAt = -99; this.keepN = 0;
    this.then = null; this.arrived = false; this.marked = new Set(); this.healQueued = false;
    // Whether she's stopped for you, how long, how long you've stood still, and how long she's been turning back to the way.
    this.halted = false; this.haltT = 0; this.stillT = 0; this.turnT = 0;
    // The fight: its bodies, what's still to come up, her bolts in the air, and when she last cast.
    this.fightS = null; this.bolts = []; this.castT = 0; this.aim = null;
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

  // On the way down, where the woods' own packs leave you be: the road's fight is staged here (src/sim/undead.js stepWoods).
  get onRoad() { return this.stage > OPENING.OFF && this.stage < OPENING.ARRIVED; }

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
      put(OFFER_SPOT);
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
    // (In the Test Dungeon a fall is a fall, and it stands you back at its start: src/sim/testhall.js.)
    if (this.sim.testHall?.on) return false;
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
        // Beat 8: asked to cast, you do, and the spark goes now rather than waiting out its time.
        if (t >= CAST_AT && t < SPARK_AT) {
          const n = this.sim.input?.[INPUT.CAST_N] + this.sim.input?.[INPUT.ATTACK];
          if (this.castSeen === undefined) this.castSeen = n;
          else if (n !== this.castSeen && t > CAST_AT + 0.3) this.time = SPARK_AT;
        }
        b = this.wake(this.time, dt, w, you);
        if (this.time >= NAME_AT) this.setStage(OPENING.NAME);
        break;
      case OPENING.NAME:
        // Arms folded, then a foot tapping.
        b = { clip: t < 1.2 ? 'Idle_FoldArms_Loop' : 'wait', face: yawTo([w.x, w.z], you), look: eye };
        break;
      case OPENING.HERD: {
        // She takes the name where she stands, points you out, and goes on ahead of you to her ledger.
        const tunnel = chamberPoint(0, 0);
        if (t < HERD.point) b = { clip: t > 0.3 && t < 2.4 ? 'agree' : 'Idle_Talking_Loop', rate: 0.7, face: yawTo([w.x, w.z], you), look: eye, blend: 3 };
        else if (t < HERD.go) b = { clip: 'Pointing into the distance', face: yawTo([w.x, w.z], tunnel), turn: 4, look: [tunnel[0], w.y + 1.3, tunnel[1]] };
        else b = this.toLedger(w, t < HERD.go + 1.8 ? eye : null);
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
  // The long story (docs/OPENING-SCRIPT.md), keyed off its moments (CAVE, src/core/opening-cave.js).
  wake(t, dt, w, you) {
    const C = CAVE, here = [w.x, w.z], face = yawTo(here, you);
    const floor = w.y;
    // Your eyes, where the camera has them: on the floor, sitting up, then standing (src/core/opening.js wakeEyeH).
    // (face is from her to you, so "back" is further along it.)
    const back = wakeEyeBack(t), eye = [you[0] + Math.sin(face) * back, this.sim.player.y + wakeEyeH(t), you[1] + Math.cos(face) * back];
    const at = (p, y) => [p[0], floor + y, p[1]];
    // The glamour. Reading the summons from her book; her hand held out to you as your eyes come open; then across
    // the cave to you through her clutter, soft and easy; and her hand out again for her last words as the glamour breaks.
    if (t < 9.4) {
      const f0 = yawTo(WITCH_MARK, you);
      const book = [w.x + Math.sin(w.yaw + 0.5) * 0.45, w.y + 1.15, w.z + Math.cos(w.yaw + 0.5) * 0.45];
      if (t < 6.0) return { clip: 'Spell_Simple_Idle_Loop', face: f0, look: book };
      if (t < 6.9) return { clip: 'idle', face: f0, look: eye };
      return { clip: 'Interact', hold: 1.05, rate: 0.8, face: f0, look: eye, blend: 3 };
    }
    if (t < SWAP_AT - 2.4) return this.weave(w, you, eye);
    // The witch is caught in it too, square on, her hand still held out to you, for a long breath after the flash.
    if (t < SWAP_AT + 0.85) return { clip: 'Interact', hold: 1.05, rate: 0.8, face, look: eye, blend: 3, tremble: t > SWAP_AT + 0.4 };
    // Seen. Two quick steps back, her hands up, as startled as you; and she holds there, staring.
    if (t < SWAP_AT + 1.25) {
      const back = [WITCH_STOP[0] - Math.sin(face) * 0.7, WITCH_STOP[1] - Math.cos(face) * 0.7];
      return { to: back, speed: 1.8, keepFace: true, face, clip: 'frightened', from: 0.25, hold: 0.6, look: eye, tremble: true, blend: 12, reach: GUARD };
    }
    if (t < C.drop) return { clip: 'frightened', hold: 0.6, face, look: eye, tremble: true, reach: GUARD };
    // "Not at the girl. At me.": her hands come down, one of them by way of her own cheek; a slow step back, watching you.
    if (t < C.backOff) {
      const d = t - C.drop;
      if (d < 2.3) return { clip: 'idle', face, look: eye, reach: d > 0.25 && d < 1.9 ? CHEEK : null, blend: 3 };
      return { to: SEEN_SPOT, speed: 0.7, keepFace: true, face, clip: 'walk', rate: -0.75, look: eye };
    }
    // The snap. She backs away among her things, working her cold fingers; raises the right hand at you; and snaps.
    if (t < C.aim) return { to: SNAP_SPOT, speed: this.paceTo(SNAP_SPOT, C.aim - 0.2 - t), keepFace: true, face, clip: 'walk', rate: -0.85, look: eye, fists: Math.sin(t * 5.5) > 0 };
    if (t < SNAP_AT - 0.3) return { clip: 'idle', face, look: eye, reach: [['R', [-0.14, 1.32, 0.5], 'down']], blend: 4, fists: t < C.aim + 0.6 && Math.sin(t * 5.5) > 0 };
    if (t < SNAP_AT + 0.9) return { clip: 'Spell_Simple_Shoot', face, look: eye, snap: t - SNAP_AT + 0.3, rate: 0.55, blend: 10 };
    // The candles catch in a wave from her hand: she watches them go, up and round the cave.
    if (t < C.comeBack) return { clip: 'idle', face, look: [w.x + Math.sin(face) * 3, w.y + 3.5, w.z + Math.cos(face) * 3] };
    // She comes back through her things, watching your eyes the whole way; stops close, and leans in to tell you what it was.
    if (t < C.lean) return { to: LEAN_SPOT, speed: this.paceTo(LEAN_SPOT, C.lean - 0.5 - t), look: eye, face };
    if (t < C.fold - 0.6) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, lean: 0.16, blend: 3 };
    // She straightens, a step back, arms folded: the truth, then.
    if (t < C.fold) return { clip: 'idle', face, look: eye, blend: 3 };
    if (t < C.bow) return { to: FOLD_SPOT, speed: 0.7, keepFace: true, face, clip: 'Idle_FoldArms_Loop', look: eye, blend: 2.5 };
    // Who she is. Her hand to her heart, and a slow, stiff bow; then she talks.
    if (t < C.bow + 0.9) return { clip: 'idle', face, look: eye, reach: HEART, blend: 3 };
    if (t < C.named + 1.3) return { clip: 'bow', from: 0.4, rate: 0.62, hold: 3.4, face, look: eye, reach: HEART, blend: 3 };
    if (t < C.doorPoint) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2 };
    // Her hand goes out past you, at the door you came through.
    const door = [PORTAL[0], PORTAL[1], PORTAL[2]];
    if (t < C.toHearth - 2.2) return { clip: 'Pointing into the distance', face: yawTo(here, [PORTAL[0], PORTAL[2]]), turn: 3, look: t < C.doorPoint + 2.4 ? door : eye, blend: 4 };
    if (t < C.toHearth) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2.5 };
    // The old story, at her hearth: across to it, her hands held to the fire, telling it into the flames; then round to you.
    const fire = at(HEARTH, 0.45);
    if (t < C.turn) {
      if (off(here, HEARTH_SPOT) > 0.06) return { to: HEARTH_SPOT, speed: this.paceTo(HEARTH_SPOT, C.toHearth + 6.0 - t), look: t < C.toHearth + 1.4 ? eye : fire };
      return { clip: 'idle', face: yawTo(here, HEARTH), turn: 3, look: fire, reach: WARM, blend: 3 };
    }
    if (t < C.lantern) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, turn: 2.6, look: eye, blend: 2.5 };
    // The old lantern on her table: a step to it, and a hand laid on it.
    if (t < C.rose) {
      if (off(here, LANTERN_SPOT) > 0.06) return { to: LANTERN_SPOT, speed: 0.95, look: LANTERN };
      return { clip: 'idle', face: yawTo(here, [LANTERN[0], LANTERN[2]]), turn: 3, look: LANTERN, reach: [['R', [-0.1, 0.97, 0.47], 'down']], blend: 3 };
    }
    // "He rose.": round to you again, arms folded.
    if (t < C.ledger) return { clip: 'Idle_FoldArms_Loop', face, turn: 2.6, look: eye, blend: 2.5 };
    // The forty-three: a hand out down the room at the ledger on its stand; then her eyes on the floor.
    const ledger = at(LECTERN, 1.25);
    if (t < C.ledger + 3.2) return { clip: 'Pointing into the distance', face: yawTo(here, LECTERN), turn: 2.6, look: ledger, blend: 4 };
    if (t < C.shame) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, turn: 2.6, look: t < C.ledger + 5 ? ledger : eye, blend: 2.5 };
    if (t < C.toYou) return { clip: 'depressed', rate: 0.8, face, turn: 2, look: [w.x + Math.sin(face) * 1.2, floor + 0.3, w.z + Math.cos(face) * 1.2], blend: 3 };
    // The three proofs. Back across the cave to you; down at the circle at your feet; a hand to her own face; your hand.
    if (t < C.one) {
      if (off(here, FOLD_SPOT) > 0.06) return { to: FOLD_SPOT, speed: this.paceTo(FOLD_SPOT, C.one - 0.5 - t), look: eye };
      return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2.5 };
    }
    const ring = [you[0], floor + 0.05, you[1]];
    if (t < C.two) return { clip: 'idle', face, look: t > C.one + 2.6 && t < C.one + 5.6 ? ring : eye, point: t > C.one + 3.4 && t < C.one + 5.4 ? ring : null, blend: 3 };
    if (t < C.steps) return { clip: 'idle', face, look: eye, reach: t < C.two + 2.6 ? CHEEK : null, blend: 3 };
    const yours = [you[0] + (w.x - you[0]) * 0.12, this.sim.player.y + 1.0, you[1] + (w.z - you[1]) * 0.12];
    if (t < SPARK_AT + 0.25) return { clip: 'idle', face, look: t < C.steps + 1.0 ? eye : yours, lean: t > C.hands ? 0.1 : 0, point: t > C.steps + 1.2 && t < C.hands ? yours : null, blend: 3 };
    // Your spark bursts the candle, and she flinches.
    if (t < SPARK_AT + 1.6) return { clip: 'frightened', from: 0.25, hold: 0.6, face, look: eye, tremble: true, blend: 12, reach: GUARD };
    if (t < C.yours) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2.5 };
    if (t < C.round) return { clip: 'idle', face, look: t < C.yours + 2.4 ? yours : eye, blend: 3 };
    // Who you are. A slow half circle round you, to stand between you and the door; and she says it.
    if (t < C.reveal - 0.3) return this.arc(clamp((t - C.round) / (C.reveal - 1.1 - C.round), 0, 1), FOLD_SPOT, DOOR_SPOT, w, you, eye);
    if (t < C.plan) {
      if (off(here, DOOR_SPOT) > 0.06) return { to: DOOR_SPOT, speed: 0.6, face, look: eye, turn: 3 };
      return { clip: t < C.after ? 'idle' : 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2.5 };
    }
    // What to do: her hand out down the cave, past you, to the tunnel and the world.
    const tunnel = chamberPoint(0, 0), out = at(tunnel, 1.5);
    if (t < C.pointOut) return { clip: 'idle', face, look: eye, blend: 3 };
    if (t < C.pointOut + 3.6) return { clip: 'Pointing into the distance', face: yawTo(here, tunnel), turn: 3, look: out, blend: 4 };
    if (t < C.cant) return { clip: 'Idle_Talking_Loop', rate: 0.6, face, look: eye, blend: 2.5 };
    // "I can't come.": a look over her shoulder at the door behind her.
    if (t < C.toOffer) return { clip: 'Idle_FoldArms_Loop', face, look: t > C.cant + 0.8 && t < C.cant + 3.4 ? door : eye, blend: 2.5 };
    // The name. Round in front of you again; and only now does she hold out her hand: the old one.
    if (t < C.offer) return this.arc(clamp((t - C.toOffer) / (C.offer - 0.6 - C.toOffer), 0, 1), DOOR_SPOT, OFFER_SPOT, w, you, eye);
    if (off(here, OFFER_SPOT) > 0.06) return { to: OFFER_SPOT, speed: 0.8, face, look: eye };
    return { clip: 'Interact', hold: 1.05, rate: 0.8, face, look: eye, blend: 3 };
  }

  // The pace that brings her to p in the time left (never a shuffle, never a run).
  paceTo(p, left) {
    const w = this.sim.villagers[1];
    return clamp(Math.hypot(p[0] - w.x, p[1] - w.z) / Math.max(0.3, left), 0.45, 1.6);
  }

  // She comes to you across the cave through her clutter, talking you round, at a pace that brings her to you in time for
  // her last words.
  weave(w, you, eye) {
    const to = WEAVE[Math.min(this.weaveI, WEAVE.length - 1)];
    if (Math.hypot(to[0] - w.x, to[1] - w.z) < 0.05 && this.weaveI < WEAVE.length - 1) this.weaveI++;
    if (this.weaveI >= WEAVE.length - 1 && Math.hypot(WITCH_STOP[0] - w.x, WITCH_STOP[1] - w.z) < 0.05) {
      return { clip: 'Idle_Talking_Loop', rate: 0.75, face: yawTo([w.x, w.z], you), look: eye, blend: 2.5 };
    }
    return { to, speed: this.weavePace, look: eye, face: yawTo([w.x, w.z], you) };
  }

  // Round you on your left, at ROUND_R, from one mark to another (k: how far round, 0 to 1), her eyes on you.
  arc(k, from, to, w, you, eye) {
    const a0 = Math.atan2(from[0] - you[0], from[1] - you[1]), a1 = Math.atan2(to[0] - you[0], to[1] - you[1]);
    let da = wrapAngle(a1 - a0);
    // (Always by the same side of you, the one away from her kitchen: there and back by one way.)
    const side = Math.sign(wrapAngle(Math.atan2(CHAMBER_AXIS[1], -CHAMBER_AXIS[0]) - a0)) || 1;
    if (Math.sign(da) !== side && Math.abs(da) > 0.05) da += side * Math.PI * 2;
    const a = a0 + da * Math.min(1, k + 0.06);
    const at = [you[0] + Math.sin(a) * ROUND_R, you[1] + Math.cos(a) * ROUND_R];
    if (k >= 1 && off(at, [w.x, w.z]) < 0.08) return { clip: 'idle', face: yawTo([w.x, w.z], you), look: eye };
    return { to: at, speed: clamp(off(at, [w.x, w.z]) / 0.35, 0.5, 1.5), look: eye };
  }

  // ---- walking out ------------------------------------------------------------------------------------------------------
  // At the lectern by the tunnel, writing your name in her ledger under the others.
  toLedger(w, look) {
    if (Math.hypot(WRITE_SPOT[0] - w.x, WRITE_SPOT[1] - w.z) > 0.05) return { to: WRITE_SPOT, speed: 1.7, look };
    return { clip: 'Interact', rate: 0.55, face: yawTo(WRITE_SPOT, LECTERN), look: [LECTERN[0], w.y + 1.05, LECTERN[1]], turn: 4 };
  }

  leaving(dt, w, you, eye) {
    const { player } = this.sim;
    const n = caveNearest(player.x, player.z);
    const s = n.s, inChamber = n.chamber >= 0;
    // Writing as you pass, and a word to you as you do; then a few steps after you, to the tunnel's mouth, and no further.
    const pen = Math.hypot(player.x - w.x, player.z - w.z);
    if (pen < 2.6 && !this.back) this.say('pass');
    const mouth = chamberPoint(0.35, 0.1);
    const tidy = this.fired.has('pass') && this.cueT > 2.2 && !inChamber
      ? (Math.hypot(mouth[0] - w.x, mouth[1] - w.z) > 0.05 ? { to: mouth, speed: 1.1, look: eye } : { clip: 'idle', face: yawTo([w.x, w.z], you), look: eye })
      : this.toLedger(w, this.fired.has('pass') && this.cueT < 3.6 ? eye : null);
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
    if (t < FALL_FROM) return { clip: 'idle', face, look: eye };
    const rubble = yawTo([w.x, w.z], CAVE_MOUTH), F = FALL;
    const side = Math.sin(face - rubble) >= 0 ? 1 : -1, away = rubble + side * AWAY_TURN, to = rubble + side * AWAY_TURN * 1.6;
    const past = [w.x + Math.sin(to) * 3, w.y + 1.0, w.z + Math.cos(to) * 3];
    // "Two hundred years I kept that door open…" and "It was only ever waiting for you.": turned to the rubble.
    if (t < F.catch - 0.5) return { clip: t < F.rubble + 4.2 ? 'idle' : 'depressed', face: away, turn: 3, look: past };
    // Back to you, and she catches you looking.
    if (t < F.sun) return { clip: t < F.catch + 1.4 ? 'Idle_FoldArms_Loop' : 'wait', face, look: eye, turn: 4 };
    // "Oh. The sun.": down at her own hands in the sun, turned over; then she tells you what you're seeing.
    const hands = [w.x + Math.sin(face) * 0.36, w.y + 1.0, w.z + Math.cos(face) * 0.36];
    if (t < F.sun + 3.4) return { clip: 'idle', face, look: t < F.sun + 2.4 ? hands : eye, reach: t < F.sun + 2.9 ? PALMS_UP : null, blend: 4 };
    if (t < F.only) return { clip: 'Idle_Talking_Loop', rate: 0.7, face, look: eye, blend: 3 };
    // "You are the only one who sees either.": she holds her own arms.
    if (t < F.home) return { clip: 'hug', face, hold: 0.95, look: eye, blend: 3 };
    // "I seem to have lost my home."
    if (t < F.coming) return { clip: 'depressed', face: away, turn: 3, look: past };
    // Coming with you: her hand out along the shelf, the way down.
    const down = routeAt(24);
    if (t < F.coming + 3.6) return { clip: 'Pointing into the distance', face: yawTo([w.x, w.z], down), turn: 4, look: [down[0], w.y + 0.8, down[1]] };
    return { clip: 'Idle_Talking_Loop', rate: 0.7, face, look: eye, blend: 3 };
  }

  // ---- Act III: the walk down ---------------------------------------------------------------------------------------------
  // She leads you down to Bellmourn: out ahead of you on the way, at your pace, talking the whole way. Stop and she stops,
  // turns and looks at you, and goes on when you've come up to her; come up on her back and she hurries on; ride your
  // shield and she rides one too, so you never get past.
  escort(dt, w, you, eye) {
    const { player } = this.sim;
    // Where you are along the way (looked for near her), how fast you're coming down it, and how far ahead she is.
    const mine = routeNear(player.x, player.z, this.prog, 60);
    const [rx, rz] = routeDir(mine);
    const along = player.vx * rx + player.vz * rz;
    const gap = this.prog - mine;
    const far = Math.hypot(player.x - w.x, player.z - w.z);
    this.hopT += dt;
    if (this.time > 0.4) this.mark('lead');
    const fighting = !!this.fightS && !this.ambushDone;
    // Run on past her and she calls after you.
    this.aheadT = -gap > 28 && !fighting ? this.aheadT + dt : 0;
    if (this.aheadT > 1.2) {
      if (!this.fired.has('slow')) { this.queue('slow', true); this.slowAt = this.time; } else if (this.time - this.slowAt > 16) this.queue('wait', true);
    }
    this.talk(dt, far < HEAR);
    // While she tells who Velscour was, you keep to her pace.
    const said = CUE_IDS[this.cue - 1];
    const healing = !this.arrived && (HEAL.some((id) => this.queued.includes(id)) || (HEAL.includes(said) && this.cueT < CUES[said].dur));
    this.sim.paceCap = healing ? HEAL_PACE : mine < MARKS.stepsEnd && !player.surfing ? STEPS_PACE : undefined;
    this.stepBolts(dt);
    // The dead, in the pines: they come up when you come down onto the bare ground below them (wherever she's got to, and
    // whatever she's in the middle of saying), and she stands with you and fights it out.
    if (!this.ambushDone && !this.fightS && this.youPassed(MARKS.ambush)) this.sprung = true;
    if (!this.ambushDone && this.sprung) {
      const b = this.fight(dt, w, you, eye, far, mine);
      if (b) return b;
    }
    // On a shield when you get on yours; off it once you're off yours and she's slowed, or at the way's end.
    // (Off hers once you're off yours and she's slowed; or you've been off yours a moment, however fast you're coming on
    // foot: she doesn't ride on ahead of someone who's walking.)
    this.afootT = player.surfing ? 0 : (this.afootT || 0) + dt;
    if (player.surfing && !this.riding && this.prog < ROUTE.len - 20) this.getOn();
    else if (this.riding && ((!player.surfing && (this.pace < OFF_AT || this.afootT > OFF_AFTER)) || this.prog >= ROUTE.len - 1)) this.getOff();
    if (this.riding) {
      this.rideT += dt;
      this.fastT = this.pace > 15 ? (this.fastT || 0) + dt : 0;
      if (this.fastT > 1) this.queue('fast', true);
      this.halted = false;
    }
    // Whether she's stopped for you. You've stood still a moment and she's a few steps on; or you've fallen well back, or
    // gone off the way. And on again: you've come up to her, or gone by. (At the way's end she stands regardless.)
    const end = this.prog >= ROUTE.len - 0.3;
    this.stillT = Math.hypot(player.vx, player.vz) < 0.6 ? this.stillT + dt : 0;
    if (!this.riding && !end) {
      if (!this.halted) {
        // (On her steps a pause is a turn on a landing, as likely as not: she gives you longer there before she takes it
        // that you've stopped, or she'd be stopping and turning round at every flight.)
        if ((this.stillT > (this.prog < MARKS.stepsEnd + 4 ? STEPS_STILL : 0.7) && gap > HALT) || gap > FAR || (far > WANDER && gap > -4 && this.time > 0.6)) { this.halted = true; this.haltT = 0; }
      } else {
        this.haltT += dt;
        // (Gone by her and on down the way, however far off: she comes after you, not waits on for you where you were.)
        if (this.haltT > 0.5 && (far < NEAR || gap < 0.6) && (far < WANDER || gap < -4)) { this.halted = false; this.turnT = 0.45; }
      }
    }
    // Her lead kept on you at your own pace; stopped, she slows to a stand in a couple of steps.
    let want = along + ((this.riding ? LEAD_RIDE : LEAD) - gap) * (this.riding ? 1.2 : 1.4);
    if (!this.riding) {
      // (You dawdling close behind her: she keeps to a stroll rather than standing on your toes.)
      if (gap < HALT && !this.halted) want = Math.max(want, Math.min(1.2, (HALT + 0.4 - gap) * 1.5));
      if (this.halted || this.turnT > 0) want = 0;
    }
    want = clamp(want, 0, this.riding ? RIDE_MAX : FOOT_MAX);
    // (Round a turn of the steps she slows and walks the corner, so she turns with it and doesn't slide round sideways.)
    // (Only as far as her lead on you allows: she gives up a step or so of it there, never more, so she's never run down.)
    if (!this.riding) { const c = cornerNear(this.prog); if (c < CORNER.near) want = Math.min(want, Math.max(CORNER.pace + c * CORNER.gain, along + (LEAD - CORNER.give - gap) * 1.4)); }
    this.pace += (want - this.pace) * Math.min(1, dt * (this.riding ? 2.5 : this.halted ? 6 : 3));
    if (end) this.pace = 0;
    this.prog = Math.min(ROUTE.len, this.prog + this.pace * dt);
    const to = routeAt(this.prog);
    // Stood waiting for you: after a while, she calls you on (again now and then, if you're still dawdling).
    this.waitT = this.halted && along < 1 ? this.waitT + dt : 0;
    if (this.waitT > 6 && this.time - this.keepAt > 12) {
      const id = KEEP[this.keepN++ % KEEP.length];
      this.fired.delete(id);
      this.queue(id, true);
      this.keepAt = this.time;
    }
    // Lines that wait for a place on the way.
    if (this.fired.has('lead')) this.place('door');
    // (In the order of the way, each after what's still waiting; the pines' warning ahead of them all.)
    for (const id of ['shelf', 'steps', 'speech', 'foot']) if (this.prog > MARKS[id] && !this.fightS) this.place(id);
    if (this.fired.has('foot')) this.place('staff');
    if (this.prog > MARKS.woods && !this.fightS) this.mark('woods');
    // (The star, and the town in sight, wait for the rest of what she's saying.)
    if (this.prog > MARKS.star && this.healQueued) this.place('star');
    if (this.prog > MARKS.sight) this.place('sight');
    // At the town's edge, with you there too (or on into town past her): once she's done talking, the scream.
    if (end && (far < 10 || mine > ROUTE.len - 2) && !this.arrived) {
      this.arrived = true;
      this.queued = this.queued.filter((id) => !ROAD_TALK.has(id));
    }
    if (this.arrived && this.endT < 0 && this.talkLeft <= 0 && !this.queued.length && !this.then) { this.speak('scream'); this.endT = this.time; }
    if (this.endT >= 0) {
      if (this.time - this.endT > 1.9) this.say('walk');
      if (this.fired.has('walk') && this.cueT > CUES.walk.dur + 0.4) this.setStage(OPENING.ARRIVED);
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
    // Turning back to the way, before she sets off down it again.
    if (this.turnT > 0 && !this.halted) {
      this.turnT -= dt;
      const [tx, tz] = routeDir(this.prog);
      return { clip: 'idle', face: Math.atan2(tx, tz), turn: 5, look: null, lift: this.hopLift() };
    }
    // Stopped for you (or stood at the way's end): turned round to you, unhurried, her eyes on you; her foot tapping in time.
    if (this.pace < 0.25 && Math.hypot(to[0] - w.x, to[1] - w.z) < 0.3) {
      // (Only slowed for you, not stopped: she keeps facing the way down, with a glance back, and goes on as you do.)
      if (!this.halted && !end) { const [tx, tz] = routeDir(this.prog); return { clip: 'idle', face: Math.atan2(tx, tz), turn: 4, look: far > 3 ? eye : null, lift: this.hopLift() }; }
      return { clip: this.halted && this.haltT > 5 ? 'wait' : 'idle', face: yawTo([w.x, w.z], you), turn: 3.2, look: eye, lift: this.hopLift() };
    }
    // (Put on the way outright: she follows it, the trees stand clear of it, and nothing turns her aside.)
    return { to, speed: Math.max(this.pace, Math.hypot(to[0] - w.x, to[1] - w.z) / Math.max(dt, 1e-3)), pace: this.pace, look, gaits: GAITS, lift: this.hopLift() };
  }

  // Whether you've come down the road as far as s along it (or past it), and are on it or near it, not off up the hillside.
  youPassed(s) {
    const { player } = this.sim, at = routeNear(player.x, player.z), [x, z] = routeAt(at);
    return at >= s && Math.hypot(player.x - x, player.z - z) < AMBUSH_NEAR;
  }

  // ---- the dead on the road -------------------------------------------------------------------------------------------------
  // (WAVE, above.) What she does through it is hers: she keeps by you, a few steps off, and throws what fire she has.
  fight(dt, w, you, eye, far, mine) {
    const sim = this.sim, { player } = sim;
    if (!this.fightS) {
      this.fightS = { t: 0, phase: 1, due: [], raiseT: 0, bodies: new Set(), casters: [], tricks: false };
      for (let i = 0; i < WAVE.first; i++) this.fightS.due.push(false);
    }
    const f = this.fightS;
    f.t += dt; f.raiseT -= dt;
    // (One you've left far behind is no longer the fight's: it goes back to being one of the woods' own.)
    for (const k of f.bodies) {
      if (k.dead || Math.hypot(k.x - player.x, k.z - player.z) < WAVE.reach) { k.lostT = 0; continue; }
      k.lostT = (k.lostT || 0) + dt;
      if (k.lostT > 6) { f.bodies.delete(k); k.aggro = false; k.hostile = false; }
    }
    const up = [...f.bodies].filter((k) => !k.dead && !k.dormant), casters = f.casters.filter((k) => !k.dead && Math.hypot(k.x - player.x, k.z - player.z) < WAVE.reach * 1.5);
    // More of them up out of the ground, a group at a time, in the trees either side of you and on the road ahead.
    if (f.due.length && f.raiseT <= 0) {
      f.raiseT = WAVE.every;
      // (Round you, wherever you've got to: run from them and they come up ahead of you.)
      const [rx, rz] = routeDir(mine);
      for (let n = 0; n < WAVE.group && f.due.length; n++) {
        // (Turn about, one side and then the other, in the bare ground either side of the road.)
        const side = (f.sideN = (f.sideN || 0) + 1) % 2 ? -1 : 1, fore = -6 + Math.random() * 16, out = 5 + Math.random() * 9;
        const x = player.x + rx * fore - rz * out * side, z = player.z + rz * fore + rx * out * side;
        if (sim.world.inside?.(x, z, 0.7)) continue;
        const k = openingRaise(sim, x, z, f.due[0], f.bodies);
        // (No body left to come up, for a good while: what's still due is let go, so the fight can end.)
        if (!k) { f.raiseT = 1; f.dry = (f.dry || 0) + 1; if (f.dry > WAVE.dry) f.due.length = 0; break; }
        f.dry = 0; f.due.shift(); f.bodies.add(k);
      }
    }
    // (Nothing in the ground to come up: no fight, and on she goes.)
    if (f.phase === 1 && !f.bodies.size) { this.ambushDone = true; this.queueStory(); return null; }
    if (!f.begun) {
      f.begun = true;
      this.queued = this.queued.filter((id) => !BEFORE_FIGHT.has(id));
      // (Said as they come up, over whatever she was saying: it can't wait its turn behind the rest of the fight's lines.)
      this.speak('risen');
      sim.event?.(EV.ROAR, w.x, w.y + 1, w.z, 1);
    }
    // Twenty down to eight: twenty more, and ten of their children among them. Those down to ten: the necromancers.
    if (f.phase === 1 && !f.due.length && up.length <= WAVE.second) {
      f.phase = 2;
      for (let i = 0; i < WAVE.more + WAVE.children; i++) f.due.push(i % 3 === 2 && i < WAVE.children * 3);
      this.queue('wave2', true);
    } else if (f.phase === 2 && !f.due.length && up.length <= WAVE.third) {
      f.phase = 3;
      for (const side of [-1, 1]) {
        const k = openingCaster(sim, ...this.necroSpot(side, mine));
        if (k) f.casters.push(k);
      }
      this.queue('necro', true);
    }
    if (f.t > 7) this.queue('fight', true);
    if (f.t > 14 && !f.tricks) { f.tricks = true; this.queue('tricks', true); }
    // Over: every one of them down (what the necromancers raised too), or it's gone on far too long.
    // (Only those still up and about, and near: one gone back into the ground, or left a long way behind, isn't the fight's.)
    const theirs = sim.knights.filter((k) => !k.dead && !k.dormant && k.owner && f.casters.includes(k.owner) && Math.hypot(k.x - player.x, k.z - player.z) < WAVE.reach * 1.5);
    // (Or you've run for the town with them behind you: they don't follow you in, and she won't stand out here alone.)
    f.left = up.length + casters.length + theirs.length + f.due.length + (f.phase < 3 ? 1 : 0);
    if ((f.phase === 3 && !f.due.length && !up.length && !casters.length && !theirs.length) || routeNear(player.x, player.z) > ROUTE.len - 25) {
      this.ambushDone = true;
      // (On from wherever the fight has left her.)
      this.prog = Math.max(this.prog, routeNear(w.x, w.z, this.prog, 400));
      this.queued = this.queued.filter((id) => !['risen', 'fight', 'tricks', 'wave2', 'necro'].includes(id));
      this.queue('after', true);
      this.queueStory();
      this.halted = false; this.pace = 0;
      return null;
    }
    // On a shield she rides on through, out ahead of you still.
    if (this.riding) return null;
    this.pace = 0;
    // Her fire: the nearest of them to her that's up, every couple of seconds. The bolt leaves her hand partway through
    // the cast; between casts she keeps a few steps from you, off the road's middle, facing what's coming.
    this.castT += dt;
    const foes = [...up, ...casters, ...theirs].filter((k) => k.state !== 8 || k.stateT > 0.8);
    let foe = null, fd = HER_FIRE.range;
    for (const k of foes) { const d = Math.hypot(k.x - w.x, k.z - w.z); if (d < fd) { fd = d; foe = k; } }
    if (this.aim) {
      const a = this.aim;
      a.t += dt;
      if (!a.shot && a.t >= HER_FIRE.at) { a.shot = true; if (!a.k.dead) this.bolts.push({ x: w.x + Math.sin(w.yaw) * 0.4, y: w.y + 1.35, z: w.z + Math.cos(w.yaw) * 0.4, k: a.k }); }
      if (a.t > 0.95) this.aim = null;
      return { clip: 'Spell_Simple_Shoot', rate: 1.15, face: yawTo([w.x, w.z], [a.k.x, a.k.z]), turn: 9, look: [a.k.x, a.k.y + 1.1 * (a.k.scale || 1), a.k.z], blend: 9 };
    }
    if (foe && this.castT > HER_FIRE.every) { this.castT = Math.random() * 0.4; this.aim = { k: foe, t: 0, shot: false }; }
    const face = foe ? yawTo([w.x, w.z], [foe.x, foe.z]) : yawTo([w.x, w.z], you);
    const look = foe ? [foe.x, foe.y + 1.1, foe.z] : eye;
    // (Too far from you, she comes to your side; crowded by you, she gives ground.)
    // (Left behind, she runs to catch you up: she won't be parted from you with the dead about.)
    if (far > 6) {
      const [rx, rz] = routeDir(mine), to = [player.x - rz * 2.6, player.z + rx * 2.6];
      return { to, speed: far > 14 ? FOOT_MAX : Math.min(4.2, far), look, gaits: GAITS };
    }
    return { clip: 'Spell_Simple_Idle_Loop', face, turn: 5, look, blend: 4 };
  }

  // Where a necromancer comes out: from behind the nearest tree past the bare ground on that side of the road (side: -1 or 1),
  // level with you or further down it. With no tree near, a good way off to that side.
  necroSpot(side, mine) {
    const { player, world } = this.sim, [rx, rz] = routeDir(mine), R = WAVE.trees;
    const t = treesInCells(Math.floor((player.x - R) / CELL), Math.ceil((player.x + R) / CELL), Math.floor((player.z - R) / CELL), Math.ceil((player.z + R) / CELL));
    let best = null, score = 1e9;
    for (let k = 0; k < t.length; k += TREE_FLOATS) {
      const px = t[k] - player.x, pz = t[k + 1] - player.z, d = Math.hypot(px, pz);
      const along = px * rx + pz * rz, across = (pz * rx - px * rz) * side;
      if (across < WAVE.clear || d > R || along < -10) continue;
      // (The nearest, and sooner one down the road than one you've passed.)
      const sc = d + (along < 0 ? -along * 2 : 0);
      if (sc < score) { score = sc; best = [t[k] + px / d * 1.7, t[k + 1] + pz / d * 1.7]; }
    }
    if (!best || world.inside?.(best[0], best[1], 0.7)) best = [player.x + rx * 6 - rz * 24 * side, player.z + rz * 6 + rx * 24 * side];
    return best;
  }

  // The dead down (or never up): who Velscour was, and what he was to her.
  queueStory() {
    if (this.healQueued) return;
    this.healQueued = true;
    for (const id of [...HEAL, ...WED]) this.queue(id);
  }

  // Her bolts: small, quick, and never much. Each flies to the body it was thrown at, and bites when it gets there.
  stepBolts(dt) {
    if (!this.bolts.length) return;
    const sim = this.sim, fx = sim.casting;
    this.bolts = this.bolts.filter((b) => {
      const ty = b.k.y + 1.05 * (b.k.scale || 1), dx = b.k.x - b.x, dy = ty - b.y, dz = b.k.z - b.z, d = Math.hypot(dx, dy, dz), step = HER_FIRE.speed * dt;
      if (d <= step + 0.3 || b.k.dead) {
        if (!b.k.dead) {
          if (fx?.hurt) fx.hurt(sim, b.k, HER_FIRE.dmg, ELEM.FIRE, b.k.x, ty, b.k.z, b.x, b.z, 4);
          else { b.k.hp -= HER_FIRE.dmg; b.k.onHit?.(sim, 'gash', b.x, b.z, 4); }
        }
        fx?.burst(FX.FLARE, ELEM.FIRE, b.k.x, ty, b.k.z, 0.3, 0.07, 0.22, { light: 5, lightR: 3 });
        return false;
      }
      b.x += dx / d * step; b.y += dy / d * step; b.z += dz / d * step;
      fx?.burst(FX.ORB, ELEM.FIRE, b.x, b.y, b.z, 0.13, 0.04, 0.12, { ax: dx / d, ay: dy / d, az: dz / d, light: 3, lightR: 2.5 });
      return true;
    });
  }

  // A line a place on the road brings on: next up, once.
  mark(id) {
    if (this.marked.has(id)) return;
    this.marked.add(id);
    this.queue(id, true);
  }

  // Or after what's waiting, once.
  place(id) {
    if (this.marked.has(id)) return;
    this.marked.add(id);
    this.queue(id);
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
    if (this.talkLeft > 0) return;
    // (With nothing else to say on the hill, above the pines: its small talk, in turn. And the town's, after the story.)
    if (!this.queued.length && near && !this.arrived && this.fired.has('lead') && !(this.fightS && !this.ambushDone)) {
      const run = this.ambushDone ? (this.fired.has('wed4') ? LOW : null) : this.fired.has('door') ? HILL : null;
      const next = run?.find((id) => !this.fired.has(id));
      if (next) this.queued.push(next);
    }
    // (Some lines run straight on into the next. At the town's edge she says what's left wherever you are.)
    if (this.then) { this.speak(this.then); this.then = null; return; }
    const i = this.queued.findIndex((id) => near || this.arrived || CUES[id].call);
    if (i < 0) return;
    const [id] = this.queued.splice(i, 1);
    this.speak(id);
    this.then = THEN[id] || null;
  }

  write(snap, H) {
    snap[H.OPENING] = this.stage;
    snap[H.OPENING_TIME] = this.time;
    snap[H.OPENING_NEXT] = this.prog;
    snap[H.OPENING_CUE] = this.cue;
    snap[H.OPENING_CUE_T] = this.cueT;
    snap[H.OPENING_FELL] = this.fellT !== undefined ? this.time - this.fellT : 99;
    snap[H.OPENING_RIDE] = this.riding ? 1 : 0;
    // (How many of the road's dead are still to be put down, while its fight is on: auto-play stays for them all.)
    snap[H.OPENING_FIGHT] = this.fightS && !this.ambushDone ? Math.max(1, this.fightS.left || 1) : 0;
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
      [w.x, w.z] = WRITE_SPOT;
    } else {
      const prog = d.opening === OPENING.COLLAPSE ? 0 : d.guide?.[3] ?? 0;
      this.prog = stage === OPENING.ARRIVED ? ROUTE.len : clamp(prog, 0, ROUTE.len);
      [w.x, w.z] = routeAt(this.prog);
      if (this.prog <= 0) { [player.x, player.z] = VIEW_SPOT; player.y = world.height(player.x, player.z); }
      this.ambushDone = this.prog > MARKS.ambush - 10;
      // (What she'd have said by there isn't said again.)
      if (this.prog > 0) for (const id of ['lead', 'door']) { this.fired.add(id); this.marked.add(id); }
      for (const id of ['shelf', 'steps', 'speech', 'foot', 'woods', 'star', 'sight']) if (this.prog > MARKS[id]) { this.fired.add(id); this.marked.add(id); }
      if (this.fired.has('foot')) for (const id of ['staff', 'staff2']) { this.fired.add(id); this.marked.add(id); }
      if (this.ambushDone) for (const id of [...HILL, 'woods', 'risen', 'fight', 'tricks', 'wave2', 'necro', 'after']) this.fired.add(id);
      // (Who Velscour was: told, if you're well on past the pines.)
      if (this.ambushDone && this.prog > MARKS.ambush + 60) { this.healQueued = true; for (const id of [...HEAL, ...WED]) this.fired.add(id); }
      // (The town's talk, about as far through as she'd be.)
      if (this.ambushDone) for (const id of LOW.slice(0, Math.floor(LOW.length * clamp((this.prog - MARKS.ambush) / (ROUTE.len - MARKS.ambush), 0, 1)))) this.fired.add(id);
    }
    for (const v of villagers) { v.x = w.x; v.z = w.z; v.y = world.height(w.x, w.z); v.yaw = yawTo([w.x, w.z], [player.x, player.z]); v.cloth?.reset(); }
  }
}
