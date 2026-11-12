// The townsfolk living their days. Each person runs the block of their day they're in (src/folk/days.js) as a little
// script: a generator that walks them somewhere, sits them down, has them work or eat or sleep, and winds itself down
// (stands them up, puts the tools away) when the hour for the next block comes. Scripts yield once a frame.
//
// What they say and who they say it to is src/folk/talk.js's: it holds people where they stand, turns their heads and lays
// gestures over whatever they're doing. Nothing here allocates per frame but paths and scripts.
import { FolkPose } from './rig.js';
import { PEOPLE, isChild } from './people.js';
import { PLACES, ROUND, T_CLEAR, wearsT } from './town.js';
import { DAYS, WORK, WORK_OF, LEISURE } from './days.js';
import { FORGE, SMITH_CLIPS } from './smithy.js';

const TAU = Math.PI * 2;
export const wrapAngle = (a) => a - TAU * Math.floor((a + Math.PI) / TAU);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => x * x * (3 - 2 * x);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// What someone's doing, for the UI and the talk (F.BUSY in src/folk/layout.js).
export const ACT = { IDLE: 0, WALK: 1, SLEEP: 2, SIT: 3, WORK: 4, SHOP: 5, EAT: 6, COOK: 7, GATHER: 8, PLAY: 9, PERFORM: 10, INN: 11, FLEE: 12, HIDE: 13, PATROL: 14, LESSON: 15 };

// The children's games: what each plays, turn about.
const GAMES = ['tag', 'knight', 'circle', 'tag', 'throw', 'knight'];
const STAGE_SONGS = ['sing_1', 'sing_2', 'sing_3', 'sing_4'];
const DANCES = ['dance_1', 'dance_2', 'dance_3', 'dance_4', 'dance_6'];

export class Folk {
  constructor(p, i, life) {
    this.p = p; this.i = i; this.id = p.id; this.life = life;
    this.child = isChild(p);
    this.posted = p.post || null;   // [x, z, y?]: stood out in the land, not one of the town's (people.js POSTED)
    this.rig = null; this.pose = null;
    this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.level = 0;
    this.posture = 'stand';
    this.act = ACT.IDLE;
    this.cur = null; this.key = '';
    this.task = null;
    this.rng = mulberry((hash(p.id) * 4294967296) >>> 0);
    this.dt = 0;
    this.hold = 0;            // > 0 while someone's talking to them: they stop and stand where they are
    this.tool = false;        // the smith: his hammer's in his hand (forge, below)
    this.look = null;         // [x, y, z] they're looking at, or null
    this.face = null;         // a yaw the talk wants them to turn to, standing
    this.alarm = false;       // running from something
    this.woken = false;
    this.asleep = false;
    this.snap = false;        // placing them straight where they'd be (at boot, after a sleep)
    this.speed = p.speed || 1;
    this.walkClip = p.walk || 'walk';
    this.house = -1;          // the village house they're in, or -1 outdoors
    this.home = null;         // their house (src/folk/town.js)
    this.bed = null;          // { bed, side } or { pallet }
    this.radius = this.child ? 0.22 : 0.3;
    this.moving = 0;          // their speed over the ground just now
    this.seat = null;
    this.gestUntil = 0; this.layerUntil = 0; this.idling = null;
    this.wait = 0;            // seconds they've stood blocked on a walk
    this.carrying = false;
  }

  get clock() { return this.life.clock; }

  play(name, o) { this.pose.play(name, o); }
  get done() { return this.pose.done; }
  get clipT() { return this.pose.time; }

  layer(name, o) {
    this.pose.layer(name, o);
    this.layerUntil = name ? this.clock + (o?.dur ?? this.life.clips.clips[name].dur) : 0;
  }

  // A gesture from the talk: the whole body if they're standing about, the top half over anything else.
  gesture(name) {
    const c = this.life.clips.clips[name] || this.life.clips.clips.talk;
    const dur = Math.min(c.loop ? 3.2 : c.dur, 6);
    if (this.posture === 'stand' && this.idling && !this.moving) {
      this.play(c.name, { fade: 0.35 });
      this.gestUntil = this.clock + dur;
    } else {
      this.layer(c.name, { from: this.posture === 'stand' ? 'Spine2' : 'Spine2', weight: this.posture === 'stand' ? 0.85 : 0.7, fade: 0.35, dur });
    }
  }

  // Still in the block that script was started for?
  alive(key) { return this.key === key && !this.alarm; }
}

export class Life {
  // ground: src/folk/ground.js; town: src/folk/town.js; clips: FolkClips; emit(event) tells the main thread things (doors).
  constructor({ ground, town, clips, emit = () => {}, people = PEOPLE }) {
    this.ground = ground; this.town = town; this.clips = clips; this.emit = emit;
    this.clock = 0;
    this.hour = 8; this.day = 0;
    this.player = [0, 0, 0];
    this.dangers = [];
    this.folk = people.map((p, i) => new Folk(p, i, this));
    this.byId = Object.fromEntries(this.folk.map((f) => [f.id, f]));
    this.townPart = ground.part(0, -1.5, 4);
    this.doors = new Map();      // door id -> Set of folk using it
    this.groups = new Map();     // place id -> { members: [] } (gathering, play, lesson)
    this.games = new Map();      // play place -> the game under way
    this.inn = town.house('inn');
    this.stage = this.findStage(this.inn);
    for (const me of this.folk) me.home = me.posted ? null : town.house(me.p.home);
    this.markReach();
    this.assignBeds();
  }

  setRig(i, rig) {
    const me = this.folk[i];
    me.rig = rig;
    me.pose = new FolkPose(rig);
    // How they sit and lie, measured off the pose: how far their hips sit behind and above where they stand.
    const tmp = new Float32Array((rig.count + 4) * 8), hips = [0, 0, 0];
    me.pose.play('sit_idle', { fade: 0 });
    me.pose.solve(0, 0, 0, 0, tmp, 0);
    me.pose.at(rig.hips, hips);
    const pelvis = 0.11 * rig.hipsHeight / 0.965;
    me.sitBack = -hips[2];
    me.seatDrop = hips[1] - pelvis;
    me.pose.play(rig.clips.clips[me.walkClip] ? 'idle' : 'idle', { fade: 0 });
    me.stride = {};
    for (const n of [me.walkClip, 'walk', 'walk_carry', 'jog', 'run', 'flee', 'crouch_walk']) me.stride[n] = rig.stride(rig.clips.clips[n]);
  }

  get ready() { return this.folk.every((f) => f.pose); }

  // Which seats can be got to from the town without going through a wall (the hips sit about this far in front of the
  // seat's middle, standing: a body's own measure comes later), and so which can be offered.
  markReach() {
    const G = this.ground;
    // (Upstairs, it's the floor the stair comes up on that counts: a sliver of floor behind a bed is free ground, but on its own.)
    const ok = (x, z, level, h) => {
      const part = level ? this.upPart(h, x, z) : this.townPart;
      return !!part && !!G.reach(level, part, x, z, G.heightFor(x, z, level ? 9 : 0.5), 1.2);
    };
    for (const h of this.town.houses) {
      for (const st of h.seats) st.ok = ok(st.x + Math.sin(st.yaw) * 0.3, st.z + Math.cos(st.yaw) * 0.3, st.level, h);
      if (h.hearth) h.hearth.ok = ok(h.hearth.x, h.hearth.z, 0, h);
      if (h.oven) h.oven.ok = ok(h.oven.x, h.oven.z, 0, h);
      // A bed is got into from the edge of it: either will do.
      for (const b of h.beds) {
        const foot = Math.atan2(b.dir[0], b.dir[1]), rx = -Math.cos(foot), rz = Math.sin(foot), e = b.width / 2 - 0.2 + 0.3;
        b.ok = [1, -1].some((s) => ok(b.x + rx * e * s, b.z + rz * e * s, b.level, h));
      }
    }
  }

  // The part of the walk grid a house's upstairs floor is on: where its stair comes up (or, with no stair known, wherever x, z is).
  upPart(h, x, z) {
    const G = this.ground;
    const head = h && h.stair >= 0 && h.route[h.stair + 1];
    return (head && G.part(1, ...head)) || G.part(1, x, z) || G.part(1, ...(G.nearestFree(1, x, z, 1.5) || [x, z]));
  }

  // ---- the day ----

  // The blocks of someone's day d: { key, at, to, kind }, in order, starting at midnight.
  plan(me, d) {
    const p = me.p, tpl = DAYS[p.job] || DAYS.farmer;
    const rest = d % 7 === 6;
    const out = [];
    for (let k = 0; k < tpl.length; k++) {
      let [at, kind] = tpl[k];
      if (at > 0) at += (hash(`${p.id}:${d}:${k}`) - 0.5) * (me.child ? 0.3 : 0.5);
      if (kind === 'lesson' && rest) kind = 'play';
      if (kind === 'help') kind = me.child && (p.work || this.parentWork(me)) && hash(`${p.id}${d}h`) < 0.5 ? 'help' : 'play';
      if (kind === 'leisure') kind = this.leisure(me, d);
      if (kind === 'stall' && !p.stall) kind = 'work';
      // The inn's children dance to Nell's songs of an evening.
      if (kind === 'play' && at >= 18 && p.home === 'inn') kind = 'perform';
      out.push({ key: `${d}:${k}`, at, kind });
    }
    for (let k = 0; k < out.length; k++) out[k].to = k + 1 < out.length ? out[k + 1].at : 24;
    return out;
  }

  leisure(me, d) {
    const p = me.p;
    const kids = this.folk.some((o) => o.child && o.home === me.home && o !== me);
    const list = p.leisure || (['lady', 'lord', 'reeve'].includes(p.job) ? LEISURE.gentry : kids && p.sex === 'f' ? LEISURE.parent : LEISURE.default);
    return list[Math.floor(hash(`${p.id}:${d}:eve`) * list.length)];
  }

  parentWork(me) {
    const parent = this.folk.find((o) => !o.child && o.home === me.home && (o.p.work || WORK_OF[o.id]));
    return parent ? WORK_OF[parent.id] || parent.p.work : null;
  }

  // The block at an hour, with a block that runs over midnight keeping last night's key.
  blockAt(me, hour, day) {
    if (me.planDay !== day) {
      me.planDay = day;
      me.today = this.plan(me, day);
      const y = this.plan(me, day - 1), last = y[y.length - 1];
      if (me.today[0].kind === last.kind) me.today[0].key = last.key;
    }
    const t = me.today;
    for (let k = t.length - 1; k >= 0; k--) if (hour >= t[k].at) return t[k];
    return t[0];
  }

  // ---- the frame ----

  // world: { hour, day, player: [x, y, z], dangers: [[x, z], ...] }
  update(dt, world) {
    if (!this.ready) return;
    const first = !this.started;
    this.hour = world.hour; this.day = world.day;
    this.player = world.player;
    this.dangers = world.dangers || [];
    this.clock += dt;
    if (first || this.jumped(world)) this.place();
    this.started = true;
    for (const me of this.folk) {
      me.dt = dt;
      const b = this.blockAt(me, this.hour, this.day);
      if (!me.cur || b.key !== me.key) { me.cur = b; me.key = b.key; me.keyAt = this.clock; }
      this.fright(me);
      if (me.posted) this.attend(me);
      // (A script that won't wind down when its hour's up is stopped.)
      if (!me.task || me.taskKey !== me.key && (me.taskDone || this.clock - me.keyAt > 45)) this.start(me);
      const r = me.task.next();
      if (r.done) { me.taskDone = true; if (me.taskKey === me.key && !me.alarm) me.task = idleUntilNext(me); }
      this.tick(me, dt);
    }
    this.spread(dt);
  }

  // Nobody stood inside anybody. Two scripts can send two people to the one spot (a shared work place, the middle of a game,
  // the spot inside the door), and nothing else keeps them apart: anyone on their feet within a body's width of another is eased
  // off them, a little a frame, onto free ground.
  spread(dt) {
    // How close two can stand: 0.55 m for two grown, 0.45 m for two children (each one's half of it, their reach in a crowd).
    const G = this.ground, f = this.folk, half = (m) => (m.child ? 0.225 : 0.275);
    // (Onto free ground; or, for one already stood on a cell the grid calls blocked, as at a table's side or a barrel, off it by
    // as little as the walls and furniture let them, the way their walking is.)
    const ease = (m, dx, dz) => {
      const out = [m.x + dx, m.y, m.z + dz];
      if (!G.free(m.level, out[0], out[2])) {
        if (G.free(m.level, m.x, m.z)) return;
        G.resolve(out, m.radius * 0.8, m.y + 0.05);
        if (Math.hypot(out[0] - m.x, out[2] - m.z) > 0.1) return;
      }
      m.x = out[0]; m.z = out[2]; m.y = G.heightFor(m.x, m.z, m.y);
    };
    for (let a = 0; a < f.length; a++) {
      const p = f[a];
      if (p.posture !== 'stand') continue;
      for (let b = a + 1; b < f.length; b++) {
        const q = f[b];
        if (q.posture !== 'stand' || q.level !== p.level || Math.abs(q.y - p.y) > 1) continue;
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), MIN = half(p) + half(q);
        if (d >= MIN) continue;
        // (One walking past one stood still: the one stood still makes way, the walker's on a path. Two walking: their own business.)
        const mp = (p.moving || 0) > 0.05, mq = (q.moving || 0) > 0.05;
        if (mp && mq) continue;
        const wp = mp ? 0 : mq ? 1 : 0.5, wq = 1 - wp;
        // (Stood on the very same spot: apart along a way of their own, so a crowd of them fans out.)
        const ux = d > 1e-4 ? dx / d : Math.sin(b * 2.39), uz = d > 1e-4 ? dz / d : Math.cos(b * 2.39);
        const step = Math.min(MIN - d, 1.2 * dt);
        if (wp) ease(p, -ux * step * wp, -uz * step * wp);
        if (wq) ease(q, ux * step * wq, uz * step * wq);
      }
    }
  }

  jumped(world) {
    // A sleep at the inn, or the clock set by hand: everyone straight to where they'd be.
    if (this.lastHour === undefined) { this.lastHour = world.hour; this.lastDay = world.day; return false; }
    const dh = (world.day - this.lastDay) * 24 + world.hour - this.lastHour;
    this.lastHour = world.hour; this.lastDay = world.day;
    return dh > 0.75 || dh < -0.01;
  }

  start(me) {
    if (me.task && !me.taskDone) me.task.return();
    me.taskKey = me.key; me.taskDone = false;
    me.task = me.alarm ? flee(me) : live(me, me.cur);
  }

  // Everyone straight into the middle of what they'd be doing.
  place() {
    for (const me of this.folk) if (me.task && !me.taskDone) { me.task.return(); me.taskDone = true; }
    // (Emptied before they're placed, not after: a gathering's ring is laid out by who's in it, and emptied after, all of them
    // stood on the one spot.)
    for (const g of this.groups.values()) g.members.length = 0;
    for (const me of this.folk) {
      for (const s of [...this.town.claims.keys()]) this.town.release(s, me.id);
      me.task = null; me.taskDone = true;
      me.posture = 'stand'; me.alarm = false; me.hold = 0; me.carrying = false; me.tool = false;
      if (me.pose) me.pose.restTo = me.pose.rest = 0;
      const b = this.blockAt(me, this.hour, this.day);
      me.cur = b; me.key = b.key;
      // Start where they live, then let the script put them where it would have got them to.
      // (Or, posted out in the land, at their post.)
      [me.x, me.z] = me.posted || me.home.inside; me.level = 0; me.y = this.ground.heightFor(me.x, me.z, 0.5);
      me.snap = true;
      this.start(me);
      for (let k = 0; k < 4 && me.snap; k++) me.task.next();
      me.snap = false;
    }
  }

  // Anything hunting in reach of town sends them running indoors.
  fright(me) {
    if (me.posted) return;
    let near = false;
    for (const [dx, dz] of this.dangers) if (Math.hypot(dx - me.x, dz - me.z) < 22) { near = true; break; }
    if (near && !me.alarm && me.house < 0) { me.alarm = true; me.calm = 0; me.task?.return(); me.taskDone = true; me.task = null; this.start(me); }
    if (me.alarm && !near) {
      me.calm = (me.calm || 0) + me.dt;
      if (me.calm > 25) { me.alarm = false; me.task?.return(); me.task = null; me.taskDone = true; this.start(me); }
    }
  }

  // Someone at a post out in the land: eyes on the player once they're near, the body round to them when they're close, and
  // back to the way they were looking when they've gone. (The talk has its own say while a word's being had: talk.js.)
  attend(me) {
    if (me.talking || me.lookUntil) return;
    const [px, py, pz] = this.player, d = Math.hypot(px - me.x, pz - me.z);
    me.look = d < 10 && Math.abs(py - me.y) < 4 ? [px, py + 1.55, pz] : null;
    me.face = d < 4.5 ? Math.atan2(px - me.x, pz - me.z) : me.p.face ?? null;
  }

  // The pose, the head, which house they're in.
  tick(me, dt) {
    const pose = me.pose;
    if (me.layerUntil && this.clock > me.layerUntil) { pose.layer(null, { fade: 0.4 }); me.layerUntil = 0; }
    if (me.look) {
      const dx = me.look[0] - me.x, dz = me.look[2] - me.z, d = Math.hypot(dx, dz);
      const eye = me.y + me.rig.headTop * (me.posture === 'sit' ? 0.72 : 0.93);
      pose.wantYaw = clamp(wrapAngle(Math.atan2(dx, dz) - me.yaw), -1.15, 1.15);
      pose.wantPitch = clamp(Math.atan2(me.look[1] - eye, Math.max(d, 0.3)), -0.55, 0.45);
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - me.yaw)) > 1.9) pose.wantYaw = 0;
    } else if (me.reading) { pose.wantYaw = 0; pose.wantPitch = -0.42; } else { pose.wantYaw = 0; pose.wantPitch = me.asleep ? 0 : 0; }
    // Standing for a talk: turn the body to them, unhurried.
    if (me.face !== null && me.posture === 'stand' && !me.moving) {
      const d = wrapAngle(me.face - me.yaw);
      me.yaw += clamp(d, -2.4 * dt, 2.4 * dt);
    }
    pose.step(dt);
    const g = this.ground.houseAt(me.x, me.z);
    me.house = g > 0 ? g - 1 : -1;
  }

  // ---- getting about ----

  // The legs of a walk from where they are to (tx, tz) on a level: each { pts, level, stair }.
  route(me, tx, tz, tl = 0) {
    const G = this.ground, legs = [];
    let x = me.x, z = me.z, l = me.level;
    const tHouse = this.town.houses[G.houseAt(tx, tz) - 1];
    if (l === 1) {
      const h = this.town.houses[G.houseAt(x, z) - 1];
      if (h && h.stair >= 0 && (tl === 0 || h !== tHouse)) {
        const foot = h.route[h.stair], head = h.route[h.stair + 1];
        const up = G.find(1, x, z, head[0], head[1]);
        if (!up) return null;
        legs.push({ pts: up, level: 1 }, { pts: [head, foot], level: 0, stair: true });
        [x, z] = foot; l = 0;
      } else if (!h) l = 0;
    }
    if (tl === 1 && tHouse && tHouse.stair >= 0) {
      if (l === 0) {
        const foot = tHouse.route[tHouse.stair], head = tHouse.route[tHouse.stair + 1];
        const w = G.find(0, x, z, foot[0], foot[1]);
        if (!w) return null;
        legs.push({ pts: w, level: 0 }, { pts: [foot, head], level: 1, stair: true });
        [x, z] = head;
      }
      const w = G.find(1, x, z, tx, tz);
      if (!w) return null;
      legs.push({ pts: w, level: 1 });
    } else {
      const w = G.find(0, x, z, tx, tz);
      if (!w) return null;
      legs.push({ pts: w, level: 0 });
    }
    // The doors each ground leg goes through.
    for (const leg of legs) {
      leg.doors = [];
      if (leg.level !== 0 || leg.stair) continue;
      for (const h of this.town.houses) {
        if (h.doorId === null) continue;
        const [dx, dz] = h.door;
        for (let k = 0; k + 1 < leg.pts.length; k++) {
          const [ax, az] = leg.pts[k], [bx, bz] = leg.pts[k + 1];
          const ux = bx - ax, uz = bz - az, L2 = ux * ux + uz * uz || 1;
          const t = clamp(((dx - ax) * ux + (dz - az) * uz) / L2, 0, 1);
          if (Math.hypot(ax + ux * t - dx, az + uz * t - dz) < 0.8) { leg.doors.push({ id: h.doorId, at: h.door, open: false, passed: false }); break; }
        }
      }
    }
    return legs;
  }

  door(id, who, open) {
    let s = this.doors.get(id);
    if (!s) this.doors.set(id, s = new Set());
    if (open) { if (!s.size) this.emit({ type: 'door', id, open: true }); s.add(who); } else if (s.delete(who) && !s.size) this.emit({ type: 'door', id, open: false });
  }

  // Who's near them, ahead, for stepping round.
  ahead(me, fx, fz) {
    let best = null, bd = 1.1;
    for (const o of this.folk) {
      if (o === me || o.level !== me.level || o.posture === 'lie') continue;
      const dx = o.x - me.x, dz = o.z - me.z, d = Math.hypot(dx, dz);
      if (d > bd || d < 1e-4) continue;
      if ((dx * fx + dz * fz) / d < 0.45) continue;
      bd = d; best = o;
    }
    const [px, , pz] = this.player, dx = px - me.x, dz = pz - me.z, d = Math.hypot(dx, dz);
    if (d < Math.max(bd, 1.2) && d > 1e-4 && (dx * fx + dz * fz) / d > 0.35) return { x: px, z: pz, d, player: true };
    return best && { x: best.x, z: best.z, d: bd, o: best };
  }

  // The inn's floor for a song: the free spot furthest from everything, on its ground floor.
  findStage(h) {
    const G = this.ground, ih = this.ground.homes[h.i + 1];
    if (!ih?.ground) return { x: h.inside[0], z: h.inside[1] };
    const [x0, z0, x1, z1] = ih.ground;
    let best = null, bd = -1;
    for (let z = z0 + 0.5; z < z1 - 0.5; z += 0.25) {
      for (let x = x0 + 0.5; x < x1 - 0.5; x += 0.25) {
        if (!G.free(0, x, z)) continue;
        let r = 0;
        while (r < 3 && [0, 1, 2, 3, 4, 5, 6, 7].every((k) => G.free(0, x + Math.cos(k * 0.785) * (r + 0.25), z + Math.sin(k * 0.785) * (r + 0.25)))) r += 0.25;
        if (r > bd) { bd = r; best = { x, z, r }; }
      }
    }
    return best || { x: h.inside[0], z: h.inside[1], r: 1 };
  }

  // Beds: their own where the house has it, sharing where two do; else a share with someone who sleeps other hours, else
  // a pallet on the floor.
  assignBeds() {
    const byHouse = new Map();
    for (const me of this.folk) {
      if (me.posted) continue;
      if (!byHouse.has(me.home)) byHouse.set(me.home, []);
      byHouse.get(me.home).push(me);
    }
    for (const [h, list] of byHouse) {
      const real = (me) => me.home === this.town.byKey[me.p.home];
      const used = h.beds.map(() => []);
      const over = [];
      for (const me of list) {
        const b = real(me) ? me.p.bed : -1;
        if (b >= 0 && b < h.beds.length && h.beds[b].ok !== false && used[b].length < 2) used[b].push(me); else over.push(me);
      }
      const nights = (me) => this.plan(me, 0).filter((k) => k.kind === 'sleep').map((k) => [k.at, k.to]);
      const overlap = (a, b) => nights(a).some(([a0, a1]) => nights(b).some(([b0, b1]) => a0 < b1 && b0 < a1));
      const pallets = this.pallets(h, over.length);
      for (const me of over) {
        const k = used.findIndex((u, j) => h.beds[j].ok !== false && (u.length === 1 && !overlap(u[0], me) || u.length === 0));
        if (k >= 0) used[k].push(me); else me.bed = { pallet: pallets.shift() || { x: h.inside[0], z: h.inside[1], level: 0, yaw: h.yaw } };
      }
      used.forEach((u, k) => {
        const shared = u.length === 2 && overlap(u[0], u[1]);
        u.forEach((me, n) => { me.bed = { bed: h.beds[k], house: h, side: shared ? (me.p.side ?? n) ? 1 : -1 : 0 }; });
      });
    }
  }

  // Floor to lay a pallet on, upstairs first: free cells with room round them, apart from each other and the beds.
  pallets(h, n) {
    const out = [];
    if (!n) return out;
    const G = this.ground, ih = this.ground.homes[h.i + 1];
    if (!ih) return out;
    const [x0, z0, x1, z1] = [ih.x0, ih.z0, ih.x1, ih.z1];
    const away = (x, z) => out.every((p) => Math.hypot(p.x - x, p.z - z) > 1.5) && h.beds.every((b) => Math.hypot(b.x - x, b.z - z) > 1.7);
    for (const level of [1, 0]) {
      for (let z = z0 + 0.75; z < z1 - 0.75 && out.length < n; z += 0.5) {
        for (let x = x0 + 0.75; x < x1 - 0.75 && out.length < n; x += 0.5) {
          if (G.houseAt(x, z) !== h.i + 1 || !G.free(level, x, z)) continue;
          if (level === 1 && G.part(1, x, z) !== G.part(1, ...h.route[h.stair + 1] || [x, z])) continue;
          const along = Math.abs(Math.sin(h.yaw)) > 0.5 ? [0, 1] : [1, 0];
          let room = true;
          for (let s = -1; s <= 1 && room; s += 0.5) for (const w of [-0.6, 0, 0.6]) if (!G.free(level, x + along[0] * s + along[1] * w, z + along[1] * s + along[0] * w)) { room = false; break; }
          if (!room || !away(x, z)) continue;
          if (h.stair >= 0 && Math.hypot(x - h.route[h.stair][0], z - h.route[h.stair][1]) < 2.5) continue;
          // (Nor across the way in: clear of the door and the first steps inside it.)
          if (level === 0 && (Math.hypot(x - h.door[0], z - h.door[1]) < 2.6 || Math.hypot(x - h.inside[0], z - h.inside[1]) < 1.8)) continue;
          out.push({ x, z, level, yaw: Math.atan2(along[0], along[1]) });
        }
      }
    }
    return out;
  }

  // ---- gatherings ----

  join(id, me) {
    let g = this.groups.get(id);
    if (!g) this.groups.set(id, g = { members: [] });
    if (!g.members.includes(me)) g.members.push(me);
    return g;
  }

  leave(id, me) {
    const g = this.groups.get(id);
    if (g) { const k = g.members.indexOf(me); if (k >= 0) g.members.splice(k, 1); }
  }

  // Their spot in a ring round a point, by their place in the group.
  ring(id, me, cx, cz, r0 = 0.75) {
    const g = this.join(id, me), n = g.members.length, k = g.members.indexOf(me);
    const r = r0 + 0.17 * Math.max(0, n - 2);
    const a = (k / Math.max(n, 1)) * TAU + hash(id) * TAU;
    let x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r;
    const p = this.ground.nearestOn(0, this.townPart, x, z, 1.5);
    if (p) [x, z] = p;
    return [x, z, Math.atan2(cx - x, cz - z)];
  }
}

// ======== the scripts ========

function* wait(me, s, key) {
  for (let t = 0; t < s; t += me.dt) { if (key && !me.alive(key)) return; yield; }
}

// Stand about for s seconds doing what they do, a gesture now and then from the talk laid in.
function* idle(me, s, key, clips = me.p.idles) {
  me.idling = clips;
  let t = 0;
  try {
    while (t < s && (!key || me.alive(key))) {
      const c = me.life.clips.clips[clips[Math.floor(me.rng() * clips.length)]] || me.life.clips.clips.idle;
      me.play(c.name, { fade: 0.6 });
      const d = Math.min(s - t, c.loop ? 5 + me.rng() * 9 : c.dur);
      for (let u = 0; u < d; u += me.dt) {
        if (key && !me.alive(key)) return;
        if (me.gestUntil && me.clock > me.gestUntil) { me.gestUntil = 0; me.play(c.name, { fade: 0.5 }); }
        yield;
      }
      t += d;
    }
  } finally { me.idling = null; }
}

// Play a clip through (or for s seconds if it loops), returning early if the block ends.
function* doClip(me, name, key, s, o = {}) {
  const c = me.life.clips.clips[name];
  me.play(name, { fade: 0.35, restart: true, ...o });
  const d = s ?? (c.loop ? 4 + me.rng() * 6 : c.dur - 0.05);
  for (let u = 0; u < d; u += me.dt) { if (key && !me.alive(key)) return; yield; }
}

function* turnTo(me, yaw) {
  let stepping = false;
  while (true) {
    const d = wrapAngle(yaw - me.yaw);
    if (Math.abs(d) < 0.04) break;
    if (me.snap) break;
    if (Math.abs(d) > 0.5 && !stepping) { me.play(me.walkClip, { speed: 0.4 * me.speed, fade: 0.25 }); stepping = true; }
    me.yaw += clamp(d, -3 * me.dt, 3 * me.dt);
    yield;
  }
  me.yaw = yaw;
  if (stepping) me.play('idle', { fade: 0.3 });
}

// Walk (or run) to a point: the way found, doors opened and shut behind them, people stepped round. o: level (0 the
// ground, 1 upstairs), gait (a clip), near (stop this far short), key (give up if the block ends).
function* walkTo(me, tx, tz, o = {}) {
  const life = me.life, G = life.ground, level = o.level ?? 0;
  if (me.posture !== 'stand') yield* standUp(me);
  if (me.snap) {
    const p = G.nearestFree(level, tx, tz, 1.5) || [tx, tz];
    me.x = p[0]; me.z = p[1]; me.level = level; me.y = G.heightFor(me.x, me.z, level ? 9 : 0.5);
    if (o.exact) { me.x = tx; me.z = tz; me.y = G.heightFor(tx, tz, level ? 9 : 0.5); }
    return true;
  }
  if (Math.hypot(tx - me.x, tz - me.z) < Math.max(0.15, o.near || 0) && me.level === level) return true;
  let legs = life.route(me, tx, tz, level);
  if (!legs) {
    // Somewhere off the walkable ground: as near as they can get.
    const p = G.nearestFree(level, tx, tz, 3);
    legs = p && life.route(me, p[0], p[1], level);
    if (!legs) return false;
  }
  if (o.exact) { const last = legs[legs.length - 1]; last.pts[last.pts.length - 1] = [tx, tz]; }
  const gait = o.gait || (me.carrying ? 'walk_carry' : me.walkClip);
  const rate = o.gait ? 1 : me.speed;
  const v0 = me.stride[gait] ?? me.rig.stride(life.clips.clips[gait]);
  const was = me.act;
  me.act = o.act ?? ACT.WALK;
  let prog = 0, win = 0, replans = 0, slip = 0, slipped = 0;
  // (Starting off the walkable ground, in furniture or boxed in by it, the first steps go straight out over it.)
  const boxed = !G.free(me.level, me.x, me.z) || me.level === 0 && G.part(0, me.x, me.z) !== life.townPart;
  try {
    for (let li = 0; li < legs.length; li++) {
      const leg = legs[li];
      let k = 1;
      while (k < leg.pts.length) {
        if (o.key && !me.alive(o.key)) return false;
        const dt = me.dt;
        // Held for a word: stand, and wait.
        if (me.hold > 0 && !o.run) {
          if (me.moving) { me.play('idle', { fade: 0.4 }); me.moving = 0; }
          yield; continue;
        }
        const [wx, wz] = leg.pts[k];
        const dx = wx - me.x, dz = wz - me.z, d = Math.hypot(dx, dz);
        const last = li === legs.length - 1 && k === leg.pts.length - 1;
        if (last && d <= Math.max(0.12, o.near || 0)) break;
        if (d < 0.08) { k++; continue; }
        const ux = dx / d, uz = dz / d;
        // Facing: eased round to the way they're going.
        const want = Math.atan2(ux, uz), off = wrapAngle(want - me.yaw);
        me.yaw += clamp(off, -5.5 * dt, 5.5 * dt);
        let v = v0 * rate * (Math.abs(off) > 1.2 ? 0.25 : Math.abs(off) > 0.6 ? 0.6 : 1);
        if (last && d < 0.6) v *= Math.max(0.45, d / 0.6);
        // Someone in the way: step round them to the right, or wait.
        let sx = 0, sz = 0;
        const fx = Math.sin(me.yaw), fz = Math.cos(me.yaw);
        // (Two who can't get round each other in a tight spot, after a moment, just squeeze past.)
        if (me.ghost > 0) me.ghost -= dt;
        const a = !leg.stair && !(me.ghost > 0) && life.ahead(me, fx, fz);
        if (a) {
          const close = a.d < me.radius + 0.42;
          const still = a.player || a.o?.moving < 0.05 || a.o?.posture !== 'stand';
          // Someone stood where they were going: near enough.
          const [ex, ez] = legs[legs.length - 1].pts[legs[legs.length - 1].pts.length - 1];
          if (still && li === legs.length - 1 && Math.hypot(a.x - ex, a.z - ez) < 0.75 && Math.hypot(me.x - ex, me.z - ez) < 1.6) break;
          // Round them on whichever side there's floor, the right first.
          const side = G.free(me.level, me.x + uz * 0.6, me.z - ux * 0.6) ? 1 : G.free(me.level, me.x - uz * 0.6, me.z + ux * 0.6) ? -1 : 0;
          // Which way they're going, against this one's own: along with them (down the same lane, to the same market) or toward them.
          const with_ = !still && a.o ? Math.sin(a.o.yaw) * fx + Math.cos(a.o.yaw) * fz : 0;
          if (with_ > 0.3) {
            // Going the same way: fall in behind at their pace, and no stepping round. (Stopping dead for each other, a line of
            // them down a lane stood more than it walked.)
            if (close) v = Math.min(v, a.o.moving * 0.92);
          } else if (close && (still || with_ < -0.3 || me.wait > 1.2)) {
            // (Coming at each other: round to the right at once, as people do, not a stop face to face first.)
            if (side) { sx = uz * side; sz = -ux * side; v *= 0.5; } else v = 0;
          } else if (close) { v = 0; }
          if (v === 0 && me.wait > (a.player ? 4 : 1.6)) { me.ghost = 1.6; v = v0 * rate * 0.5; }
          else if (side && !(with_ > 0.3)) { sx = uz * 0.6 * side; sz = -ux * 0.6 * side; v *= 0.8; }
        }
        me.wait = v === 0 ? me.wait + dt : 0;
        const step = Math.min(v * dt, d);
        const nx = me.x + ux * step + sx * v * dt * 0.6, nz = me.z + uz * step + sz * v * dt * 0.6;
        const out = [nx, 0, nz];
        if (slip > 0) slip -= dt;
        else if (!leg.stair && !(boxed && li === 0 && k === 1)) G.resolve(out, me.radius * 0.8, me.y + 0.05);
        const moved = Math.hypot(out[0] - me.x, out[2] - me.z);
        me.x = out[0]; me.z = out[2];
        me.y = G.heightFor(me.x, me.z, me.y);
        me.level = leg.stair ? (me.y > 2 ? 1 : 0) : leg.level;
        me.moving = moved / dt;
        // The walk played to the ground it covers, so the feet don't skate.
        const sp = clamp(me.moving / v0, 0.35, 1.6);
        if (me.moving > 0.05) me.play(gait, { fade: 0.3, sync: true, speed: sp });
        else if (me.wait > 0.4) me.play('idle', { fade: 0.4 });
        // Doors: opened as they come up to one, shut once they're through.
        for (const dr of leg.doors || []) {
          const dd = Math.hypot(dr.at[0] - me.x, dr.at[1] - me.z);
          if (!dr.open && dd < 1.9) { dr.open = true; life.door(dr.id, me.i, true); }
          if (dr.open && !dr.passed && dd < 0.6) dr.near = true;
          if (dr.open && !dr.passed && dr.near && dd > 1.5) { dr.passed = true; life.door(dr.id, me.i, false); }
        }
        // Not getting anywhere: find the way again, or in the end just go.
        prog += moved; win += dt;
        if (win > 2.5 && prog > 0.4) { win = 0; prog = 0; }
        if (win > 2.5 && me.wait === 0 && slipped < 2) {
          // Caught on a corner the way runs close by: on through it for a step or two.
          win = 0; prog = 0; slip = 0.8; slipped++;
        } else if (win > 2.5) {
          win = 0; prog = 0;
          life.stuck = (life.stuck || 0) + 1;
          (life.stuckLog ||= []).push([me.id, +me.x.toFixed(1), +me.z.toFixed(1), me.level, me.cur.kind, +wx.toFixed(1), +wz.toFixed(1), me.wait > 0 ? 'wait' : 'move']);
          if (replans++ < 2) {
            const nl = life.route(me, tx, tz, level);
            if (nl) { closeDoors(me, legs); legs.splice(0, legs.length, ...nl); li = -1; break; }
          } else { me.x = wx; me.z = wz; me.y = G.heightFor(wx, wz, me.y); k++; }
        }
        yield;
      }
    }
  } finally {
    closeDoors(me, legs);
    me.moving = 0;
    if (me.act === (o.act ?? ACT.WALK)) me.act = was === ACT.WALK ? ACT.IDLE : was;
  }
  if (o.exact || o.settle !== false) {
    if (!o.keepGait) me.play('idle', { fade: 0.4 });
  }
  return true;
}

function closeDoors(me, legs) {
  for (const leg of legs) for (const dr of leg.doors || []) if (dr.open && !dr.passed) { dr.passed = true; me.life.door(dr.id, me.i, false); }
}

// Off the spot a little, onto it: the last steps to a seat or a work place, where the walking grid won't go (between a
// bench and its table, up to a vat).
function* stepTo(me, x, z, yaw, o = {}) {
  if (me.snap) { me.x = x; me.z = z; me.yaw = yaw; me.y = me.life.ground.heightFor(x, z, me.level ? 9 : 0.5); return; }
  const G = me.life.ground;
  const d0 = Math.hypot(x - me.x, z - me.z);
  if (d0 > 0.05) {
    me.play(me.walkClip, { fade: 0.3, speed: 0.6 * me.speed, sync: true });
    const v = (me.stride[me.walkClip] || 1) * 0.6 * me.speed;
    while (true) {
      const dx = x - me.x, dz = z - me.z, d = Math.hypot(dx, dz);
      if (d < 0.03) break;
      const s = Math.min(d, v * me.dt);
      me.x += dx / d * s; me.z += dz / d * s;
      me.yaw += clamp(wrapAngle(Math.atan2(dx, dz) - me.yaw), -5 * me.dt, 5 * me.dt);
      me.y = G.heightFor(me.x, me.z, me.y);
      yield;
    }
  }
  yield* turnTo(me, yaw);
  if (!o.keep) me.play('idle', { fade: 0.35 });
}

// Get there and onto the spot: walk to the nearest of the town's cells to it, and then step on.
function* goTo(me, x, z, yaw, o = {}) {
  const G = me.life.ground, level = o.level ?? 0;
  const part = level ? G.part(1, x, z) || G.part(1, ...(G.nearestFree(1, x, z, 1.5) || [x, z])) : me.life.townPart;
  const p = G.reach(level, part, x, z, G.heightFor(x, z, level ? 9 : 0.5));
  if (!p && !me.snap) return false;
  const ok = yield* walkTo(me, ...(p || [x, z]), { ...o, level, settle: false });
  if (!ok && !me.snap) return false;
  yield* stepTo(me, x, z, yaw ?? me.yaw, o);
  return true;
}

// Sit on a seat ({ x, z, y, yaw, level }), the hips just forward of its middle.
function* sitOn(me, seat, o = {}) {
  const f = (me.sitBack || 0.25) + 0.05;
  const rx = seat.x + Math.sin(seat.yaw) * f, rz = seat.z + Math.cos(seat.yaw) * f;
  const ry = seat.y - (me.seatDrop || 0.5);
  if (me.snap) {
    me.x = rx; me.z = rz; me.yaw = seat.yaw; me.level = seat.level; me.y = ry;
    me.play('sit_idle', { fade: 0 }); me.posture = 'sit'; me.seat = seat;
    return true;
  }
  const ok = yield* goTo(me, rx, rz, seat.yaw, { level: seat.level, key: o.key });
  if (!ok) return false;
  const y0 = me.y;
  me.play('sit_down', { fade: 0.2 });
  me.posture = 'sit'; me.seat = seat;
  while (!me.done) { me.y = lerp(y0, ry, smooth(clamp(me.clipT / 1.3, 0, 1))); yield; }
  me.y = ry;
  me.play('sit_idle', { fade: 0.25 });
  return true;
}

function* standUp(me) {
  if (me.posture === 'lie') yield* rise(me);
  if (me.posture === 'sit') {
    const y0 = me.y, floor = me.life.ground.heightFor(me.x, me.z, me.y + 0.3);
    me.layer(null, { fade: 0.2 });
    me.play('sit_up', { fade: 0.2 });
    if (!me.snap) while (!me.done) { me.y = lerp(y0, floor, smooth(clamp(me.clipT / 0.9, 0, 1))); yield; }
    me.y = floor;
    me.posture = 'stand'; me.seat = null;
    me.play('idle', { fade: 0.3 });
  }
  if (me.posture === 'crouch' || me.posture === 'floor') {
    if (me.posture === 'floor') { me.pose.restTo = 0; if (me.snap) me.pose.rest = 0; me.play('get_up', { fade: 0.25 }); if (!me.snap) while (!me.done) yield; }
    me.posture = 'stand';
    me.play('idle', { fade: 0.4 });
  }
}

// Into bed: sat on its edge, then lain back and the legs swung in. Two sharing a bed take a side each.
function* lieDown(me) {
  const G = me.life.ground, b = me.bed;
  if (b.pallet) {
    const p = b.pallet;
    if (me.snap) { me.x = p.x; me.z = p.z; me.yaw = p.yaw; me.level = p.level; me.y = G.heightFor(p.x, p.z, p.level ? 9 : 0.5); me.play('get_up', { fade: 0, t: 0, speed: 0 }); me.posture = 'floor'; me.pose.restTo = me.pose.rest = 1; return true; }
    const ok = yield* goTo(me, p.x, p.z, p.yaw, { level: p.level });
    if (!ok) return false;
    me.play('get_up', { fade: 0.3, speed: -1 });
    me.posture = 'floor';
    while (!me.done) yield;
    me.play('get_up', { fade: 0.1, t: 0, speed: 0 });
    me.pose.restTo = 1;
    return true;
  }
  const bed = b.bed, foot = Math.atan2(bed.dir[0], bed.dir[1]);
  // (Right of the bed, lying in it.)
  const rx = -Math.cos(foot), rz = Math.sin(foot);
  // (Two to a bed lie 0.25 either side of its middle, as the blanket's drawn over them: LAT in src/gfx/blankets.js. Sunk 0.1 into
  // the straw, heads in the pillow.)
  const lat = b.side * 0.25;
  const lie = { x: bed.x + rx * lat, z: bed.z + rz * lat, y: bed.y - 0.1, yaw: foot };
  // Which edge they sit on to get in: their side, or whichever the room lets them reach.
  const edges = (b.side >= 0 ? [1, -1] : [-1, 1]).map((s) => {
    const e = bed.width / 2 - 0.2;
    return { x: bed.x + rx * e * s, z: bed.z + rz * e * s, y: bed.y, yaw: Math.atan2(rx * s, rz * s), level: bed.level };
  });
  const reach = (e) => {
    const f = (me.sitBack || 0.25) + 0.05, x = e.x + Math.sin(e.yaw) * f, z = e.z + Math.cos(e.yaw) * f;
    const part = bed.level ? me.life.upPart(b.house, x, z) : me.life.townPart;
    return G.reach(bed.level, part, x, z, G.heightFor(x, z, bed.level ? 9 : 0.5), 1.2);
  };
  const edge = edges.find(reach) || edges[0];
  me.edge = edge; me.lie = lie;
  if (me.snap) {
    me.x = lie.x; me.z = lie.z; me.y = lie.y; me.yaw = lie.yaw; me.level = bed.level;
    me.play('get_up', { fade: 0, t: 0, speed: 0 }); me.posture = 'lie';
    me.pose.restTo = me.pose.rest = 1;
    return true;
  }
  const ok = yield* sitOn(me, edge);
  if (!ok) return false;
  yield* wait(me, 0.6 + me.rng());
  const from = { x: me.x, z: me.z, y: me.y, yaw: me.yaw };
  me.play('get_up', { fade: 1.5, t: 0, speed: 0 });
  me.posture = 'lie';
  while (me.pose.w < 1) {
    const k = smooth(me.pose.w);
    me.x = lerp(from.x, lie.x, k); me.z = lerp(from.z, lie.z, k); me.y = lerp(from.y, lie.y, k);
    me.yaw = from.yaw + wrapAngle(lie.yaw - from.yaw) * k;
    yield;
  }
  me.x = lie.x; me.z = lie.z; me.y = lie.y; me.yaw = lie.yaw;
  me.pose.restTo = 1;
  return true;
}

// Out of bed: sat up onto its edge, feet on the floor.
function* rise(me) {
  me.pose.restTo = 0;
  if (me.snap) me.pose.rest = 0;
  if (me.posture === 'floor') { yield* standUp(me); return; }
  const edge = me.edge;
  if (!edge) { me.posture = 'stand'; return; }
  const f = (me.sitBack || 0.25) + 0.05;
  const to = { x: edge.x + Math.sin(edge.yaw) * f, z: edge.z + Math.cos(edge.yaw) * f, y: edge.y - (me.seatDrop || 0.5), yaw: edge.yaw };
  const from = { x: me.x, z: me.z, y: me.y, yaw: me.yaw };
  me.asleep = false;
  me.play('sit_idle', { fade: me.snap ? 0 : 1.3 });
  while (me.pose.w < 1 && !me.snap) {
    const k = smooth(me.pose.w);
    me.x = lerp(from.x, to.x, k); me.z = lerp(from.z, to.z, k); me.y = lerp(from.y, to.y, k);
    me.yaw = from.yaw + wrapAngle(to.yaw - from.yaw) * k;
    yield;
  }
  me.x = to.x; me.z = to.z; me.y = to.y; me.yaw = to.yaw;
  me.posture = 'sit'; me.seat = edge;
}

// ======== the blocks of the day ========

// Whatever the block, live it out; when it's over, wind down.
function* live(me, b) {
  const key = b.key, life = me.life;
  me.reading = false; me.look = null; me.face = null;
  try {
    switch (b.kind) {
      case 'sleep': yield* sleep(me, key); break;
      case 'cook': yield* cook(me, key); break;
      case 'eat': yield* eat(me, key, me.home); break;
      case 'home': yield* atHome(me, key); break;
      case 'work': yield* work(me, key, WORK[WORK_OF[me.id] || me.p.work]); break;
      case 'help': yield* work(me, key, WORK[WORK_OF[me.id] || me.p.work || life.parentWork(me)], true); break;
      case 'perform': yield* perform(me, key); break;
      case 'stall': yield* stall(me, key); break;
      case 'shop': yield* shopAtHome(me, key); break;
      case 'errand': yield* errand(me, key); break;
      case 'gather': yield* gather(me, key); break;
      case 'stroll': yield* stroll(me, key); break;
      case 'inn': yield* evening(me, key); break;
      case 'play': yield* play(me, key); break;
      case 'lesson': yield* lesson(me, key); break;
      case 'patrol': yield* patrol(me, key); break;
      case 'post': yield* post(me, key); break;
      case 'watch': yield* post(me, key, ['watch_gate', 'watch_west']); break;
      case 'train': yield* train(me, key); break;
      case 'tryst': yield* tryst(me, key); break;
      case 'hunt': yield* hunt(me, key); break;
      case 'tithe': yield* tithe(me, key); break;
      case 'posted': yield* posted(me, key); break;
      default: yield* atHome(me, key);
    }
  } finally {
    me.reading = false; me.look = null; me.face = null; me.carrying = false;
    for (const s of [...life.town.claims.keys()]) life.town.release(s, me.id);
    for (const id of life.groups.keys()) life.leave(id, me);
  }
}

// Posted out in the land (src/folk/people.js POSTED): stood at their post, on the land as it lies there, day and night,
// with the things they do standing about. Whoever comes up, they look at, and turn to when they're close (Life.attend).
function* posted(me, key) {
  const [x, z, y] = me.posted;
  me.x = x; me.z = z; me.level = 0; me.y = y ?? me.life.ground.landHeight(x, z);
  me.yaw = me.p.face ?? 0; me.posture = 'stand'; me.act = ACT.IDLE; me.snap = false;
  while (me.alive(key)) yield* idle(me, 30, key);
}

// Between a script's end and the next block: stand, or sit on.
function* idleUntilNext(me) {
  const key = me.key;
  while (me.alive(key)) {
    if (me.posture === 'stand') yield* idle(me, 20, key); else yield;
  }
}

function* sleep(me, key) {
  const h = me.home, life = me.life;
  me.act = ACT.WALK;
  if (me.house !== h.i || me.snap) yield* goTo(me, ...h.inside, null, { key });
  const ok = yield* lieDown(me);
  if (!ok) { yield* idle(me, 5, key); return; }
  me.act = ACT.SLEEP;
  me.asleep = true;
  me.pose.wantYaw = 0;
  while (me.alive(key)) {
    if (me.woken) {
      // Woken by the stranger: sat up, until they've gone.
      yield* rise(me);
      me.act = ACT.SIT;
      while (me.woken && me.alive(key)) yield;
      if (!me.alive(key)) break;
      yield* wait(me, 2 + me.rng() * 2, key);
      yield* lieDown(me);
      me.act = ACT.SLEEP; me.asleep = true;
    }
    yield;
  }
  me.asleep = false;
  // Up, and a stretch.
  yield* rise(me);
  yield* wait(me, 1 + me.rng() * 2);
  yield* standUp(me);
  if (me.rng() < 0.5) yield* doClip(me, 'scratch', null, 3);
  void life;
}

// At home and about it: sat a while, by the fire, at a chest, upstairs; the children playing about.
function* atHome(me, key) {
  const h = me.home, life = me.life, town = life.town;
  me.act = ACT.IDLE;
  while (me.alive(key)) {
    yield;
    const r = me.rng();
    if (r < 0.45 && h.seats.length) {
      const s = town.seat(h, me.id, { table: false }) || town.seat(h, me.id, { table: false, level: 1 });
      if (s && town.claim(s, me.id)) {
        if (yield* sitOn(me, s, { key })) {
          me.act = ACT.SIT;
          yield* wait(me, 30 + me.rng() * 60, key);
        }
        if (me.posture === 'sit') yield* standUp(me);
        town.release(s, me.id);
        continue;
      }
    }
    if (r < 0.65 && h.hearth) {
      // Warming themselves: one of the two places either side of the fire, held while they're there (the cook's is the middle).
      const hs = h.hearth;
      h.warm ||= [-1, 1].map((sd) => ({ sd }));
      const w = h.warm.find((o) => town.free(o, me.id));
      if (w && town.claim(w, me.id)) {
        const fx = hs.dir[0], fz = hs.dir[1], x = hs.x - fx * 0.75 + fz * 0.62 * w.sd, z = hs.z - fz * 0.75 - fx * 0.62 * w.sd;
        try {
          if (yield* goTo(me, x, z, Math.atan2(hs.x - x, hs.z - z), { key })) yield* idle(me, 15 + me.rng() * 25, key, ['idle', 'idle_ual', 'relax']);
        } finally { town.release(w, me.id); }
        continue;
      }
    }
    if (r < 0.85) {
      const things = h.furniture.filter((f) => ['chest', 'shelf', 'barrel', 'sacks'].includes(f.kind) && f.y < 1.2);
      const t = things[Math.floor(me.rng() * things.length)];
      if (t) {
        const [cx, cz] = h.inside, dx = cx - t.x, dz = cz - t.z, dl = Math.hypot(dx, dz) || 1;
        const off = t.kind === 'shelf' ? 0.75 : 0.8;
        if (yield* goTo(me, t.x + dx / dl * off, t.z + dz / dl * off, Math.atan2(-dx, -dz), { key })) {
          yield* doClip(me, t.kind === 'chest' ? 'open_chest' : 'interact', key);
          if (me.rng() < 0.5) yield* doClip(me, 'pick_up', key);
          yield* idle(me, 4 + me.rng() * 6, key);
        }
        continue;
      }
    }
    // A while stood about the room.
    const p = life.ground.nearestOn(0, life.townPart, h.inside[0] + (me.rng() - 0.5) * 3, h.inside[1] + (me.rng() - 0.5) * 3, 2);
    if (p && (yield* walkTo(me, p[0], p[1], { key }))) yield* idle(me, 10 + me.rng() * 20, key, me.child ? ['idle', 'look_around', 'jump', 'scratch'] : me.p.idles);
    else yield* idle(me, 5, key);
  }
}

// Whoever cooks in the house, at its hearth: the pot, the fire, the table laid.
function* cook(me, key) {
  const h = me.home, town = me.life.town, hs = h.hearth;
  if (!hs || !town.claim(hs, me.id)) { yield* atHome(me, key); return; }
  me.act = ACT.COOK;
  yield* goTo(me, hs.x, hs.z, Math.atan2(hs.dir[0], hs.dir[1]), { key });
  // (Stood to it, the pot tended at arm's length: crouched at the fire, a cook read as leaping into it.)
  const clips = ['interact', 'idle_ual', 'interact', 'pick_up', 'interact', 'look_around'];
  let n = 0;
  while (me.alive(key)) {
    const c = clips[n++ % clips.length];
    if (c === 'idle_ual') yield* idle(me, 4 + me.rng() * 6, key, ['idle_ual', 'idle']);
    else yield* doClip(me, c, key);
    // Now and then a dish to the table.
    if (n % 5 === 0 && h.tables.length && me.alive(key)) {
      const t = h.tables.find((q) => q.level === 0) || h.tables[0];
      me.carrying = true;
      const side = [t.x, t.z + t.hz + 0.45];
      if (yield* goTo(me, side[0], side[1], Math.PI, { key, level: t.level })) yield* doClip(me, 'interact', key);
      me.carrying = false;
      yield* goTo(me, hs.x, hs.z, Math.atan2(hs.dir[0], hs.dir[1]), { key });
    }
  }
  town.release(hs, me.id);
}

// What's set before someone at table: a trencher, a cup and bread at a meal, a tankard at the inn. The renderer draws it on the
// table in front of their seat (Renderer.dish), until they get up.
function setPlace(me, h, s, kind) {
  const t = s.table >= 0 && h.tables[s.table];
  if (!t) return;
  const fx = Math.sin(s.yaw), fz = Math.cos(s.yaw);
  const inside = (x, z, m) => Math.abs(x - t.x) < t.hx - m && Math.abs(z - t.z) < t.hz - m;
  // Out from the seat the way it faces, to just inside the table's near edge.
  let d = 0.2;
  while (d < 1.6 && !inside(s.x + fx * d, s.z + fz * d, 0.1)) d += 0.04;
  if (d >= 1.6) return;
  d += 0.08;
  const x = clamp(s.x + fx * d, t.x - t.hx + 0.14, t.x + t.hx - 0.14), z = clamp(s.z + fz * d, t.z - t.hz + 0.14, t.z + t.hz - 0.14);
  me.dish = true;
  me.life.emit({ type: 'dish', id: me.i, on: true, kind, at: [x, t.y, z], yaw: s.yaw });
}
function clearPlace(me) {
  if (!me.dish) return;
  me.dish = false;
  me.life.emit({ type: 'dish', id: me.i, on: false });
}

// At their table, eating, with whoever else is: the right hand to the mouth and back, the left on the board.
function* eat(me, key, h) {
  const town = me.life.town;
  const s = town.seat(h, me.id) || town.seat(h, me.id, { table: false }) || town.seat(h, me.id, { level: 1 });
  if (!s || !town.claim(s, me.id)) { yield* atHome(me, key); return; }
  me.act = ACT.EAT;
  if (!(yield* sitOn(me, s, { key }))) { town.release(s, me.id); yield* atHome(me, key); return; }
  setPlace(me, h, s, 'setting');
  try {
    while (me.alive(key)) {
      yield* wait(me, 2.5 + me.rng() * 5, key);
      if (!me.alive(key)) break;
      if (me.hold <= 0) me.layer('eat', { from: 'RightShoulder', weight: 0.55, fade: 0.35, dur: 2.4 });
    }
  } finally { clearPlace(me); }
  yield* standUp(me);
  town.release(s, me.id);
}

// Their trade, at their workplace.
function* work(me, key, w, helping = false) {
  const life = me.life, town = life.town;
  if (!w) { yield* atHome(me, key); return; }
  me.act = ACT.WORK;
  if (w.place) { yield* outdoorWork(me, key, life.town.places[w.place], w); return; }
  const h = town.house(w.house);
  if (w.forge) { yield* forge(me, key); return; }
  // Sitting work: the reeve's ledgers, Orrin's books.
  if (w.seat) {
    const tables = h.tables.filter((t) => t.level === 0);
    const t = w.seat === 'corner' ? tables.sort((a, b) => a.hx * a.hz - b.hx * b.hz)[0] : tables.sort((a, b) => b.hx * b.hz - a.hx * a.hz)[0];
    const seats = h.seats.filter((s) => s.table === h.tables.indexOf(t) && town.free(s, me.id));
    const s = seats[0] || town.seat(h, me.id);
    if (s && town.claim(s, me.id) && (yield* sitOn(me, s, { key }))) {
      me.act = ACT.SIT;
      while (me.alive(key)) {
        me.reading = me.hold <= 0;
        yield* wait(me, 6 + me.rng() * 10, key);
        if (me.alive(key) && me.hold <= 0 && me.rng() < 0.4) me.layer(me.rng() < 0.5 ? 'scratch' : 'eat', { from: 'RightShoulder', weight: 0.6, dur: 2.5 });
      }
      me.reading = false;
      yield* standUp(me);
      town.release(s, me.id);
    } else yield* atHome(me, key);
    return;
  }
  // Standing work: at the hearth, or off a piece of furniture.
  let spot = null;
  if (w.hearth || w.oven) {
    const hs = w.oven ? h.oven : h.hearth;
    if (hs && town.claim(hs, me.id)) spot = { x: hs.x, z: hs.z, yaw: Math.atan2(hs.dir[0], hs.dir[1]), level: 0, claim: hs };
  } else {
    const level = w.level ?? 0;
    const list = h.furniture.filter((f) => f.kind === w.near && f.level === level && (f.kind !== 'barrel' || f.y < 1));
    const [cx, cz] = h.inside;
    // A piece nobody's at; the middle one of a row first.
    list.sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz));
    for (const f of list) {
      if (!town.free(f, me.id) && !w.watch) continue;
      let x, z, yaw;
      if (f.kind === 'loom') { x = f.x; z = f.z; yaw = Math.atan2(f.dir[0], f.dir[1]); } else {
        const mid = life.ground.homes[h.i + 1];
        const mx = mid ? (mid.x0 + mid.x1) / 2 : h.x, mz = mid ? (mid.z0 + mid.z1) / 2 : h.z;
        let dx = mx - f.x, dz = mz - f.z;
        const dl = Math.hypot(dx, dz) || 1;
        dx /= dl; dz /= dl;
        const off = (f.r || 0) + (w.off ?? 0.8);
        x = f.x + dx * off; z = f.z + dz * off;
        if (w.watch) { const a = (hash(me.id) - 0.5) * 1.6; const c = Math.cos(a), s = Math.sin(a); [dx, dz] = [dx * c - dz * s, dx * s + dz * c]; x = f.x + dx * off; z = f.z + dz * off; }
        yaw = w.faceRoom ? Math.atan2(dx, dz) : Math.atan2(-dx, -dz);
      }
      if (!w.watch) town.claim(f, me.id);
      spot = { x, z, yaw, level, claim: w.watch ? null : f };
      break;
    }
  }
  if (!spot) { yield* atHome(me, key); return; }
  if (!(yield* goTo(me, spot.x, spot.z, spot.yaw, { key, level: spot.level }))) { yield* idle(me, 10, key); return; }
  const clips = w.clips || ['idle'];
  let n = Math.floor(me.rng() * clips.length);
  while (me.alive(key)) {
    yield;
    if (w.watch) { const o = life.byId[w.watch]; me.look = o ? [o.x, o.y + 1.2, o.z] : null; }
    if (w.serve && me.rng() < w.serve) { yield* serve(me, key, h, spot); continue; }
    const c = clips[n++ % clips.length];
    if (me.hold > 0) { yield* idle(me, 2, key); continue; }
    if (c === 'crouch') { me.posture = 'crouch'; yield* doClip(me, 'crouch', key, 3 + me.rng() * 4); me.posture = 'stand'; me.play('idle', { fade: 0.5 }); continue; }
    const cl = life.clips.clips[c];
    if (['idle', 'idle_ual', 'fold_arms', 'fold_arms_ual', 'wait', 'look_around', 'relax'].includes(c)) yield* idle(me, 4 + me.rng() * 8, key, [c]);
    else yield* doClip(me, c, key, cl.loop ? 6 + me.rng() * 10 : undefined);
    if (w.carry && n % 4 === 0 && me.alive(key)) {
      // A sack out to the cart, and back.
      const pl = town.places[w.carry];
      me.carrying = true;
      if (pl && (yield* goTo(me, pl.at[0], pl.at[1], pl.yaw ?? 0, { key }))) yield* doClip(me, 'interact', key);
      me.carrying = false;
      if (me.alive(key)) yield* goTo(me, spot.x, spot.z, spot.yaw, { key, level: spot.level });
    }
  }
  me.look = null;
  if (spot.claim) town.release(spot.claim, me.id);
  void helping;
}

// Where the smith stands at his anvil: on the side of it the house was built for him to (the anvil's `dir`, tools/folk/spots.py),
// as near as the blows were worked out for (FORGE in src/folk/smithy.js), facing it. { x, y, z, yaw, anvil }, or null.
export function forgeSpot(town) {
  const anvil = town.house('smith').furniture.find((f) => f.kind === 'anvil' && (f.dir[0] || f.dir[1]));
  if (!anvil) return null;
  const [dx, dz] = anvil.dir;
  return { x: anvil.x + dx * FORGE.off, y: anvil.y, z: anvil.z + dz * FORGE.off, yaw: Math.atan2(-dx, -dz), anvil };
}

// The smith's day at the anvil. He takes his hammer up off it, works a heat (a run of blows, each one down on the anvil's
// face: tools/folk/smith_clips.mjs), stands back with it at his side to look the work over, and now and then lays it down to
// fold his arms over what he's made. me.tool: the hammer's in his hand (src/folk/folk.worker.js puts it there, or on the
// anvil). It's laid down again before he goes anywhere.
function* forge(me, key) {
  const life = me.life, town = life.town, spot = forgeSpot(town), C = SMITH_CLIPS, blow = life.clips.clips[C.blow];
  if (!spot || !town.claim(spot.anvil, me.id)) { yield* atHome(me, key); return; }
  // His hand to the handle and up with it; or down with it and away.
  const hammer = function* (up, k) {
    const dur = life.clips.clips[C.take].dur, at = up ? C.takeAt : dur - C.takeAt;
    me.play(C.take, { fade: 0.3, restart: true, speed: up ? 1 : -1 });
    for (let u = 0; u < dur - 0.05; u += me.dt) {
      if (k && !me.alive(k)) return;
      if (u >= at) me.tool = up;
      yield;
    }
    me.tool = up;
  };
  try {
    if (!(yield* goTo(me, spot.x, spot.z, spot.yaw, { key, level: 0 }))) { yield* idle(me, 10, key); return; }
    while (me.alive(key)) {
      yield;
      if (me.hold > 0) { yield* idle(me, 2, key, [me.tool ? C.hold : 'idle_ual']); continue; }
      if (!me.tool) { yield* hammer(true, key); continue; }
      // A heat: whole blows, so it never stops with the hammer in the air.
      yield* doClip(me, C.blow, key, blow.dur * (5 + Math.floor(me.rng() * 6)) - 0.05, { fade: 0.2 });
      if (!me.alive(key)) break;
      if (me.rng() < 0.7) { yield* idle(me, 3 + me.rng() * 4, key, [C.hold]); continue; }
      yield* hammer(false, key);
      if (me.alive(key)) yield* idle(me, 5 + me.rng() * 6, key, ['fold_arms_ual', 'look_around', 'idle_ual']);
    }
    // (His hour's up: the hammer's put down before he walks off. Not if he's running for his life.)
    if (me.tool && !me.alarm) yield* hammer(false, null);
  } finally { me.tool = false; town.release(spot.anvil, me.id); }
}

// Out to a table in the inn with a jug, and back.
function* serve(me, key, h, spot) {
  const town = me.life.town;
  const sat = me.life.folk.filter((o) => o.posture === 'sit' && o.seat && o.house === h.i && o.seat.table >= 0 && o !== me);
  if (!sat.length) { yield* idle(me, 6, key); return; }
  const o = sat[Math.floor(me.rng() * sat.length)];
  const t = h.tables[o.seat.table];
  // Stand at the table's end nearest them.
  const ex = Math.abs(o.x - t.x) / (t.hx || 1) > Math.abs(o.z - t.z) / (t.hz || 1);
  const sx = ex ? t.x + Math.sign(o.x - t.x) * (t.hx + 0.45) : o.x, sz = ex ? o.z : t.z + Math.sign(o.z - t.z) * (t.hz + 0.45);
  // (One at a time to a table: two with jugs had walked to the same end of it and stood in each other.)
  const waiting = (t.served ||= {});
  if (!town.free(waiting, me.id)) { yield* idle(me, 4, key); return; }
  town.claim(waiting, me.id);
  me.carrying = true;
  try {
    if (yield* goTo(me, sx, sz, Math.atan2(t.x - sx, t.z - sz), { key })) {
      me.look = [o.x, o.y + 1, o.z];
      yield* doClip(me, 'interact', key);
      me.carrying = false;
      yield* idle(me, 2 + me.rng() * 3, key, ['talk', 'idle']);
      me.look = null;
    }
  } finally { town.release(waiting, me.id); me.carrying = false; }
  me.carrying = false;
  if (me.alive(key)) yield* goTo(me, spot.x, spot.z, spot.yaw, { key });
  void town;
}

// Out of doors: the fields, the woodpile, the herb beds. A spot within the place, the work there, another spot.
function* outdoorWork(me, key, pl, w) {
  const G = me.life.ground;
  if (!pl) { yield* idle(me, 10, key); return; }
  while (me.alive(key)) {
    yield;
    const a = me.rng() * TAU, r = (pl.r || 0.3) * Math.sqrt(me.rng());
    const p = G.nearestOn(0, me.life.townPart, pl.at[0] + Math.sin(a) * r, pl.at[1] + Math.cos(a) * r, 2) || pl.at;
    const yaw = pl.yaw ?? me.rng() * TAU;
    if (!(yield* walkTo(me, p[0], p[1], { key }))) { yield* idle(me, 5, key); continue; }
    yield* turnTo(me, yaw);
    const clips = w.clips || pl.clips || ['idle'];
    for (let k = 0; k < 2 + me.rng() * 3 && me.alive(key); k++) {
      const c = clips[Math.floor(me.rng() * clips.length)];
      const cl = me.life.clips.clips[c];
      if (c === 'pick_up' || c === 'interact') yield* doClip(me, c, key);
      else yield* doClip(me, c, key, cl.loop ? 8 + me.rng() * 14 : undefined);
    }
    yield* idle(me, 3 + me.rng() * 5, key, ['idle', 'look_around', 'scratch']);
  }
}

// Keeping their stall: the wares set out, the day's trade, packed up at dusk and carried home.
function* stall(me, key) {
  const life = me.life, pl = life.town.places[me.p.stall];
  if (!pl) { yield* work(me, key, WORK[me.p.work]); return; }
  me.act = ACT.WALK;
  if (!(yield* goTo(me, pl.at[0], pl.at[1], pl.yaw, { key }))) { yield* idle(me, 10, key); return; }
  if (!me.snap) {
    yield* doClip(me, 'interact', key);
    yield* doClip(me, 'pick_up', key);
    yield* doClip(me, 'interact', key);
  }
  me.act = ACT.SHOP;
  me.shopOpen = true;
  life.emit({ type: 'stall', id: pl.id, open: true });
  try {
    while (me.alive(key)) yield* idle(me, 30, key, ['idle', ...me.p.idles, 'wait']);
    // Packing up.
    me.act = ACT.WORK;
    me.shopOpen = false;
    life.emit({ type: 'stall', id: pl.id, open: false });
    yield* doClip(me, 'interact', null);
    yield* doClip(me, 'pick_up', null);
    me.carrying = true;
    yield* goTo(me, ...me.home.inside, null, {});
    me.carrying = false;
  } finally {
    if (me.shopOpen) { me.shopOpen = false; life.emit({ type: 'stall', id: pl.id, open: false }); }
  }
}

// Their own counter at home: the herbalist's table.
function* shopAtHome(me, key) {
  me.shopOpen = true;
  try { yield* work(me, key, { house: me.home.key, seat: 'table', read: false }); } finally { me.shopOpen = false; }
}

// To a stall that's open, or the well, and home with something.
function* errand(me, key) {
  const life = me.life, town = life.town;
  const open = life.folk.filter((o) => o.shopOpen && o.p.stall && o !== me);
  me.act = ACT.WALK;
  if (open.length && me.rng() < 0.8) {
    const k = open[Math.floor(me.rng() * open.length)], pl = town.places[k.p.stall];
    const [fx, fz] = pl.front;
    const queue = life.join(`q:${pl.id}`, me), n = queue.members.indexOf(me);
    const back = n * 0.9, dx = fx - pl.at[0], dz = fz - pl.at[1], dl = Math.hypot(dx, dz) || 1;
    if (yield* goTo(me, fx + dx / dl * back, fz + dz / dl * back, Math.atan2(-dx, -dz), { key })) {
      while (me.alive(key) && queue.members.indexOf(me) > 0) { me.look = [k.x, k.y + 1.4, k.z]; yield* idle(me, 2, key, ['wait', 'idle']); }
      if (me.alive(key)) {
        yield* goTo(me, fx, fz, Math.atan2(-dx, -dz), { key });
        me.look = [k.x, k.y + 1.4, k.z]; k.look = [me.x, me.y + 1.4, me.z];
        me.act = ACT.GATHER;
        life.emit({ type: 'trade', who: me.i, keeper: k.i });
        yield* idle(me, 8 + me.rng() * 10, key, ['talk', 'idle', 'agree']);
        yield* doClip(me, 'pick_up', key);
        k.look = null; me.look = null;
      }
    }
    life.leave(`q:${pl.id}`, me);
  } else {
    const w = town.places.well;
    if (yield* goTo(me, w.at[0] + 1.2, w.at[1], -Math.PI / 2, { key })) { yield* doClip(me, 'interact', key); yield* doClip(me, 'pick_up', key); }
  }
  me.carrying = true;
  yield* goTo(me, ...me.home.inside, null, { key });
  me.carrying = false;
  if (me.alive(key)) yield* atHome(me, key);
}

// Stood in a ring in the square, talking.
function* gather(me, key, ids = ['well', 'square_n', 'square_s', 'square_e', 'inn_door']) {
  const life = me.life;
  // The busiest place that has room, mostly.
  const pick = ids.map((id) => life.town.places[id]).filter(Boolean).sort((a, b) => (life.groups.get(b.id)?.members.length || 0) - (life.groups.get(a.id)?.members.length || 0));
  const pl = pick.find((p) => (life.groups.get(p.id)?.members.length || 0) < p.cap && me.rng() < 0.7) || pick[Math.floor(me.rng() * pick.length)];
  life.join(pl.id, me);
  me.act = ACT.GATHER;
  me.group = pl.id;
  try {
    let [x, z, yaw] = life.ring(pl.id, me, ...pl.at);
    yield* goTo(me, x, z, yaw, { key });
    while (me.alive(key)) {
      yield* idle(me, 3, key);
      // The ring shifts as people come and go.
      const [nx, nz, nyaw] = life.ring(pl.id, me, ...pl.at);
      if (Math.hypot(nx - x, nz - z) > 0.5 && me.hold <= 0) { [x, z, yaw] = [nx, nz, nyaw]; yield* goTo(me, x, z, yaw, { key }); }
      else if (Math.abs(wrapAngle(nyaw - me.yaw)) > 0.3 && me.hold <= 0) { yaw = nyaw; yield* turnTo(me, yaw); }
    }
  } finally { me.group = null; }
}

// About the streets: a few places in turn, a while at each.
function* stroll(me, key) {
  const life = me.life, pts = [...ROUND, ...PLACES.filter((p) => p.kind === 'gather').map((p) => p.at)].filter((p) => !wearsT(me.p) || p[0] < T_CLEAR - 4);
  me.act = ACT.WALK;
  while (me.alive(key)) {
    yield;
    const p = pts[Math.floor(me.rng() * pts.length)];
    const q = life.ground.nearestOn(0, life.townPart, p[0] + (me.rng() - 0.5) * 3, p[1] + (me.rng() - 0.5) * 3, 2);
    if (!q || !(yield* walkTo(me, q[0], q[1], { key }))) { yield* idle(me, 4, key); continue; }
    yield* idle(me, 6 + me.rng() * 14, key, ['look_around', 'idle', ...me.p.idles]);
  }
}

// An evening at the Tolling Bell: sat with a drink, or stood by the fire; the songs, the dancing.
function* evening(me, key) {
  const life = me.life, town = life.town, h = life.inn;
  me.act = ACT.WALK;
  const s = town.seat(h, me.id) || town.seat(h, me.id, { table: false });
  if (s && town.claim(s, me.id) && (yield* sitOn(me, s, { key }))) {
    me.act = ACT.INN;
    setPlace(me, h, s, 'tankard');
    try { while (me.alive(key)) {
      yield* wait(me, 5 + me.rng() * 9, key);
      if (!me.alive(key) || me.hold > 0) continue;
      const singer = life.folk.find((o) => o.act === ACT.PERFORM && o.house === h.i);
      me.look = singer && me.rng() < 0.7 ? [singer.x, singer.y + 1.4, singer.z] : null;
      const r = me.rng();
      if (r < 0.5) me.layer('eat', { from: 'RightShoulder', weight: 0.55, fade: 0.35, dur: 2.4 });
      else if (r < 0.62) me.layer(singer ? 'clap' : 'laugh', { from: 'Spine2', weight: 0.75, dur: 3 });
      else if (r < 0.7) me.layer('talk', { from: 'Spine2', weight: 0.7, dur: 4 });
    } } finally { clearPlace(me); }
    me.look = null;
    yield* standUp(me);
    town.release(s, me.id);
  } else {
    // No seat: stood with the others by the fire.
    yield* gatherAt(me, key, 'inn_stand', h.hearth ? [h.hearth.x - h.hearth.dir[0] * 1.6, h.hearth.z - h.hearth.dir[1] * 1.6] : h.inside, ACT.INN);
  }
}

function* gatherAt(me, key, id, at, act = ACT.GATHER) {
  const life = me.life;
  life.join(id, me);
  me.act = act;
  me.group = id;
  try {
    const [x, z, yaw] = life.ring(id, me, at[0], at[1], 0.7);
    yield* goTo(me, x, z, yaw, { key });
    while (me.alive(key)) yield* idle(me, 6, key);
  } finally { me.group = null; life.leave(id, me); }
}

// Nell's songs, the children dancing to them, at the inn of an evening.
function* perform(me, key) {
  const life = me.life, st = life.stage;
  const singer = me.id === 'nell';
  const a = singer ? 0 : me.id === 'pip' ? 2.2 : -2.2;
  const x = st.x + Math.sin(a) * (singer ? 0 : 1.3), z = st.z + Math.cos(a) * (singer ? 0 : 1.3);
  const yaw = Math.atan2(life.inn.x - x, life.inn.z - z);
  if (!(yield* goTo(me, x, z, yaw, { key }))) { yield* idle(me, 10, key); return; }
  me.act = ACT.PERFORM;
  let n = Math.floor(hash(`${me.id}${life.day}`) * 4);
  while (me.alive(key)) {
    const song = singer ? STAGE_SONGS[n++ % 4] : DANCES[n++ % DANCES.length];
    yield* doClip(me, song, key, Math.min(life.clips.clips[song].dur, 16));
    me.act = ACT.IDLE;
    yield* idle(me, 6 + me.rng() * 10, key, singer ? ['bow', 'idle', 'wait'] : ['idle', 'jump', 'cheer']);
    me.act = ACT.PERFORM;
  }
}

// The children at play, in a game of everyone at the place: tag, the Knight and the Tessariels, a ring, stones.
function* play(me, key, id) {
  const life = me.life;
  const places = ['green', 'square_play'];
  id = id || places[me.home.x < 0 || me.p.home === 'chandler' ? 0 : 1];
  if (me.id === 'bryony' && me.rng() < 0.6) { yield* bones(me, key); return; }
  const pl = life.town.places[id];
  const g = life.join(id, me);
  me.act = ACT.PLAY;
  try {
    const p = life.ground.nearestOn(0, life.townPart, pl.at[0] + (me.rng() - 0.5) * 3, pl.at[1] + (me.rng() - 0.5) * 3, 3) || pl.at;
    yield* walkTo(me, p[0], p[1], { key, gait: me.snap ? undefined : 'jog' });
    while (me.alive(key)) {
      yield;
      const game = gameAt(life, id, g);
      if (game.kind === 'tag') yield* tag(me, key, game, pl);
      else if (game.kind === 'knight') yield* knight(me, key, game, pl);
      else if (game.kind === 'circle') yield* circle(me, key, game, pl, id);
      else yield* throwing(me, key, game, pl);
    }
  } finally { life.leave(id, me); }
}

function gameAt(life, id, g) {
  let game = life.games.get(id);
  if (!game || life.clock > game.until || !g.members.includes(game.it)) {
    const n = game ? game.n + 1 : Math.floor(hash(id + life.day) * GAMES.length);
    const kids = g.members;
    game = { n, kind: kids.length < 2 ? 'throw' : GAMES[n % GAMES.length], until: life.clock + 50 + hash(`${id}${n}`) * 50, it: kids[Math.floor(hash(`${id}it${n}`) * kids.length)] || null };
    life.games.set(id, game);
  }
  return game;
}

// One's it: after the nearest; the rest away from them, and the caught one's it.
function* tag(me, key, game, pl) {
  const life = me.life;
  while (me.alive(key) && life.games.get(pl.id) === game && life.clock < game.until) {
    yield;
    const it = game.it;
    let tx, tz, gait;
    if (it === me) {
      const others = life.groups.get(pl.id)?.members.filter((o) => o !== me) || [];
      const prey = others.sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (!prey) return;
      tx = prey.x; tz = prey.z; gait = 'run';
      if (Math.hypot(prey.x - me.x, prey.z - me.z) < 0.7) {
        game.it = prey; game.tagged = life.clock;
        yield* doClip(me, me.rng() < 0.5 ? 'cheer' : 'jump', key, 1.6);
        continue;
      }
    } else if (it && life.clock - (game.tagged || 0) > 1.5) {
      const dx = me.x - it.x, dz = me.z - it.z, d = Math.hypot(dx, dz) || 1;
      if (d > 5) { yield* idle(me, 1, key, ['idle', 'look_around']); continue; }
      // Away from them, but not out of the place.
      tx = me.x + dx / d * 3; tz = me.z + dz / d * 3;
      const ox = tx - pl.at[0], oz = tz - pl.at[1], od = Math.hypot(ox, oz);
      if (od > pl.r) { tx = pl.at[0] + ox / od * pl.r * 0.8 - dz / d * 2; tz = pl.at[1] + oz / od * pl.r * 0.8 + dx / d * 2; }
      gait = d < 2.5 ? 'run' : 'jog';
    } else { yield* idle(me, 0.5, key, ['idle']); continue; }
    // A short dash, then look again.
    yield* dash(me, tx, tz, gait, 0.7);
  }
}

// Running straight at a point on open ground, for a little while.
function* dash(me, tx, tz, gait, s) {
  const G = me.life.ground, v = me.stride[gait] || 2.5;
  me.play(gait, { fade: 0.25, sync: true });
  for (let t = 0; t < s; t += me.dt) {
    const dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    me.yaw += clamp(wrapAngle(want - me.yaw), -6 * me.dt, 6 * me.dt);
    const nx = me.x + Math.sin(me.yaw) * v * me.dt, nz = me.z + Math.cos(me.yaw) * v * me.dt;
    // (Always a frame at least, there or not: a game that called this again at once would never let the frame end.)
    if (d < 0.2 || !G.free(0, nx, nz)) { me.play('idle', { fade: 0.3 }); yield; break; }
    me.x = nx; me.z = nz; me.y = G.heightFor(nx, nz, me.y);
    me.moving = v;
    yield;
  }
  me.moving = 0;
}

// The Knight and the Tessariels: one's the knight, the rest come at them and die, dramatically, and get up and do it again.
function* knight(me, key, game, pl) {
  const life = me.life;
  while (me.alive(key) && life.clock < game.until) {
    yield;
    const k = game.it;
    if (!k) return;
    if (k === me) {
      // Holding the hill.
      const comer = life.groups.get(pl.id)?.members.find((o) => o !== me && o.charging && Math.hypot(o.x - me.x, o.z - me.z) < 1.6);
      if (comer) {
        yield* turnTo(me, Math.atan2(comer.x - me.x, comer.z - me.z));
        yield* doClip(me, me.rng() < 0.6 ? 'spar' : 'kick', key);
        comer.slain = true;
        yield* idle(me, 1.5, key, ['angry_2', 'idle']);
      } else yield* idle(me, 1.2, key, ['angry_3', 'idle', 'fold_arms']);
      continue;
    }
    // A Tessariel: off a way, then charge.
    const a = me.rng() * TAU, r = 3.5;
    const sx = k.x + Math.sin(a) * r, sz = k.z + Math.cos(a) * r;
    if (!life.ground.free(0, sx, sz)) { yield* idle(me, 1, key); continue; }
    yield* dash(me, sx, sz, 'jog', 2.5);
    yield* turnTo(me, Math.atan2(k.x - me.x, k.z - me.z));
    yield* idle(me, 1 + me.rng() * 3, key, ['cheer', 'idle', 'warm_up']);
    me.charging = true; me.slain = false;
    yield* dash(me, k.x, k.z, 'run', 2.2);
    for (let t = 0; t < 2 && !me.slain; t += me.dt) yield;
    me.charging = false;
    if (me.slain) {
      // Dying, at length.
      me.play('fall', { fade: 0.15 });
      me.posture = 'floor';
      for (let t = 0; t < 3 + me.rng() * 2; t += me.dt) yield;
      // The fall carried them off a way: they get up from where it left them.
      const out = [0, 0, 0];
      me.pose.at(me.rig.hips, out);
      const x0 = me.x, z0 = me.z;
      me.play('get_up', { fade: 0.7, t: 0, speed: 0 });
      while (me.pose.w < 1) { const k = smooth(me.pose.w); me.x = lerp(x0, out[0], k); me.z = lerp(z0, out[2], k); yield; }
      me.play('get_up', { fade: 0, restart: true });
      while (!me.done) yield;
      me.posture = 'stand';
      me.play('idle', { fade: 0.3 });
      me.slain = false;
    }
  }
}

// Stood in a ring: clapping, and one in the middle dancing or flipping.
function* circle(me, key, game, pl, id) {
  const life = me.life;
  const [x, z, yaw] = life.ring(id, me, pl.at[0], pl.at[1], 1.6);
  if (game.it === me) {
    yield* goTo(me, pl.at[0], pl.at[1], me.yaw, { key });
    while (me.alive(key) && life.clock < game.until) yield* doClip(me, ['dance_5', 'flip', 'jump', 'dance_3'][Math.floor(me.rng() * 4)], key, 6);
    return;
  }
  yield* goTo(me, x, z, yaw, { key });
  while (me.alive(key) && life.clock < game.until) {
    const it = game.it;
    if (it) me.look = [it.x, it.y + 1, it.z];
    yield* doClip(me, me.rng() < 0.6 ? 'clap' : 'cheer', key, 3 + me.rng() * 3);
  }
  me.look = null;
}

// Stones at nothing.
function* throwing(me, key, game, pl) {
  const life = me.life;
  const a = me.rng() * TAU;
  const p = life.ground.nearestOn(0, life.townPart, pl.at[0] + Math.sin(a) * 2, pl.at[1] + Math.cos(a) * 2, 2) || pl.at;
  yield* walkTo(me, p[0], p[1], { key });
  while (me.alive(key) && life.clock < game.until) {
    yield* doClip(me, 'pick_up', key);
    yield* doClip(me, 'throw', key);
    yield* idle(me, 2 + me.rng() * 3, key, ['look_around', 'idle', 'cheer']);
  }
}

// Bryony and her bones, crouched over them at the edge of the green, by herself.
function* bones(me, key) {
  const life = me.life, pl = life.town.places.green;
  const p = life.ground.nearestOn(0, life.townPart, pl.at[0] - pl.r - 1, pl.at[1] + 1, 3) || pl.at;
  yield* goTo(me, p[0], p[1], 0, { key });
  me.act = ACT.PLAY;
  while (me.alive(key)) {
    me.posture = 'crouch';
    yield* doClip(me, 'crouch', key, 12 + me.rng() * 20);
    me.posture = 'stand';
    yield* idle(me, 4, key, ['idle', 'look_around']);
  }
  me.posture = 'stand';
}

// Elowen's school: her stood before them, the children in an arc.
function* lesson(me, key) {
  const life = me.life, pl = life.town.places.lesson;
  const teacher = life.byId.elowen;
  me.act = ACT.LESSON;
  if (me === teacher) {
    yield* goTo(me, pl.at[0], pl.at[1], pl.yaw, { key });
    while (me.alive(key)) yield* idle(me, 5, key, ['talk', 'talk', 'point', 'idle', 'nod']);
    return;
  }
  const g = life.join('lesson', me);
  try {
    // A place in the arc, laid out for the whole class: by who's come so far, every child after the fifth stood on the end place.
    const n = g.members.indexOf(me), m = Math.max(life.folk.filter((o) => o.child).length, 5), spread = Math.min(2.6, 0.3 * m);
    const a = pl.yaw + (n / (m - 1) - 0.5) * spread;
    const x = pl.at[0] + Math.sin(a) * 2.6, z = pl.at[1] + Math.cos(a) * 2.6;
    yield* goTo(me, x, z, Math.atan2(pl.at[0] - x, pl.at[1] - z), { key });
    while (me.alive(key)) {
      me.look = teacher.act === ACT.LESSON ? [teacher.x, teacher.y + 1.5, teacher.z] : null;
      yield* idle(me, 4, key, ['idle', 'idle', 'scratch', 'look_around', me.rng() < 0.1 ? 'wave' : 'idle']);
    }
  } finally { me.look = null; life.leave('lesson', me); }
}

// Jory's round: the edges of the town, the lantern up, a while at each corner.
function* patrol(me, key) {
  const life = me.life;
  me.act = ACT.PATROL;
  let k = Math.floor(me.rng() * ROUND.length);
  while (me.alive(key)) {
    yield;
    const [x, z] = ROUND[k++ % ROUND.length];
    me.layer('lantern', { from: 'RightShoulder', weight: 1, fade: 0.6, dur: 1e6 });
    if (!(yield* walkTo(me, x, z, { key, act: ACT.PATROL }))) { yield* idle(me, 3, key); continue; }
    me.act = ACT.PATROL;
    yield* idle(me, 4 + me.rng() * 8, key, ['look_around', 'lantern', 'idle_ual']);
  }
  me.layer(null, { fade: 0.5 });
}

// The watch at its posts: the one nearest home that nobody's holding, kept for the whole turn. (The posts are the town's two
// ends, 130 m apart: going turn about, the watch spent its day walking between them.)
function* post(me, key, ids = ['watch_west', 'watch_gate']) {
  const life = me.life, town = life.town;
  me.act = ACT.WORK;
  const hx = me.home?.x ?? me.x, hz = me.home?.z ?? me.z;
  const posts = ids.map((id) => town.places[id]).filter(Boolean).sort((a, b) => Math.hypot(a.at[0] - hx, a.at[1] - hz) - Math.hypot(b.at[0] - hx, b.at[1] - hz));
  while (me.alive(key)) {
    yield;
    const pl = posts.find((p) => town.free(p, me.id));
    if (!pl) { yield* stroll(me, key); continue; }
    town.claim(pl, me.id);
    try {
      yield* goTo(me, pl.at[0], pl.at[1], pl.yaw, { key });
      while (me.alive(key)) {
        yield* idle(me, 60 + me.rng() * 90, key, ['fold_arms_ual', 'look_around', 'idle_ual', 'fold_arms']);
        if (me.alive(key)) yield* turnTo(me, pl.yaw + (me.rng() - 0.5) * 1.6);
      }
    } finally { town.release(pl, me.id); }
  }
}

// The squires' yard: warming up, press-ups, and the two of them at it with sticks.
function* train(me, key) {
  const life = me.life, pl = life.town.places.yard;
  if (!pl) { yield* gather(me, key); return; }
  const g = life.join('yard', me);
  me.act = ACT.WORK;
  try {
    const n = g.members.indexOf(me);
    const x = pl.at[0] + (n ? 1.1 : -1.1), z = pl.at[1];
    yield* goTo(me, x, z, n ? -Math.PI / 2 : Math.PI / 2, { key });
    while (me.alive(key)) {
      const other = g.members.find((o) => o !== me && Math.hypot(o.x - me.x, o.z - me.z) < 3);
      if (other) {
        yield* turnTo(me, Math.atan2(other.x - me.x, other.z - me.z));
        yield* doClip(me, ['spar', 'spar_2', 'kick', 'spar'][Math.floor(me.rng() * 4)], key);
        yield* idle(me, 1 + me.rng() * 2, key, ['idle', 'laugh', 'angry_2']);
      } else {
        const c = ['warm_up', 'press_up', 'spar', 'warm_up'][Math.floor(me.rng() * 4)];
        if (c === 'press_up') { me.posture = 'floor'; yield* doClip(me, c, key, 8); me.posture = 'stand'; me.play('idle', { fade: 0.5 }); }
        else yield* doClip(me, c, key, c === 'warm_up' ? 12 : undefined);
      }
    }
  } finally { life.leave('yard', me); }
}

// The oak, at night: two who shouldn't be, standing close.
function* tryst(me, key) {
  const life = me.life, pl = life.town.places.oak;
  const other = life.byId[me.id === 'cedric' ? 'elowen' : 'cedric'];
  const side = me.id === 'cedric' ? 1 : -1;
  const x = pl.at[0] + side * 0.45, z = pl.at[1];
  yield* goTo(me, x, z, side > 0 ? -Math.PI / 2 : Math.PI / 2, { key });
  me.act = ACT.GATHER;
  me.group = 'oak';
  let hugged = false;
  try {
    while (me.alive(key)) {
      const here = other && other.group === 'oak' && Math.hypot(other.x - me.x, other.z - me.z) < 1.5;
      me.look = here ? [other.x, other.y + other.rig.headTop * 0.93, other.z] : null;
      if (!here) { yield* idle(me, 3, key, ['look_around', 'wait', 'idle']); continue; }
      // Near the end, once.
      if (!hugged && me.cur.to - life.hour < 0.25 && side > 0) { hugged = true; other.hugNow = true; yield* doClip(me, 'hug', key); continue; }
      if (me.hugNow) { me.hugNow = false; hugged = true; yield* doClip(me, 'hug', key); continue; }
      yield* idle(me, 3, key, ['idle', 'idle', 'heart', 'talk']);
    }
  } finally { me.group = null; me.look = null; }
}

// Corran at the woods' edge, looking, listening, crouched over a track.
function* hunt(me, key) {
  const life = me.life, pl = life.town.places.woods_edge || life.town.places.watch_west;
  me.act = ACT.WORK;
  while (me.alive(key)) {
    yield;
    const a = me.rng() * TAU;
    const p = life.ground.nearestOn(0, life.townPart, pl.at[0] + Math.sin(a) * 6, pl.at[1] + Math.cos(a) * 6, 3) || pl.at;
    if (!(yield* walkTo(me, p[0], p[1], { key, gait: me.rng() < 0.3 ? 'crouch_walk' : undefined }))) { yield* idle(me, 4, key); continue; }
    if (me.rng() < 0.4) { me.posture = 'crouch'; yield* doClip(me, 'crouch', key, 5 + me.rng() * 6); me.posture = 'stand'; me.play('idle', { fade: 0.5 }); }
    yield* idle(me, 6 + me.rng() * 10, key, ['look_around', 'idle']);
  }
}

// Garth's round: a knock at each door for the Throne's share, and the sack home to the barn.
function* tithe(me, key) {
  const life = me.life, town = life.town;
  me.act = ACT.WORK;
  const doors = town.houses.filter((h) => h !== me.home && h.key !== 'reeve');
  for (let k = 0; k < 4 && me.alive(key); k++) {
    yield;
    const h = doors[Math.floor(me.rng() * doors.length)];
    const [ox, oz] = h.outside, yaw = Math.atan2(h.door[0] - ox, h.door[1] - oz);
    if (!(yield* goTo(me, ox, oz, yaw, { key }))) continue;
    yield* doClip(me, 'interact', key);
    yield* idle(me, 5 + me.rng() * 8, key, ['wait', 'idle_ual', 'scratch']);
    yield* doClip(me, 'pick_up', key);
    me.carrying = true;
  }
  if (me.alive(key)) {
    const pl = town.places.barn;
    yield* goTo(me, pl.at[0], pl.at[1], pl.yaw, { key });
    yield* doClip(me, 'interact', key);
  }
  me.carrying = false;
  if (me.alive(key)) yield* work(me, key, WORK.barn);
}

// Running from something: indoors, the nearest door, and stood frightened inside until it's gone.
function* flee(me) {
  const life = me.life;
  yield* standUp(me);
  me.act = ACT.FLEE;
  yield* doClip(me, ['afraid', 'scared', 'frightened'][Math.floor(me.rng() * 3)], null, 1.2);
  const h = life.town.houses.filter((o) => o.doorId !== null).sort((a, b) => Math.hypot(a.outside[0] - me.x, a.outside[1] - me.z) - Math.hypot(b.outside[0] - me.x, b.outside[1] - me.z))[0];
  const home = Math.hypot(me.home.outside[0] - me.x, me.home.outside[1] - me.z) < 30 ? me.home : h;
  yield* walkTo(me, ...home.inside, { gait: 'flee', run: true, act: ACT.FLEE });
  me.act = ACT.HIDE;
  while (me.alarm) yield* idle(me, 4, null, ['afraid', 'scared', 'idle', 'look_around']);
}

export { walkTo, sitOn, standUp, lieDown, rise, idle, wait, goTo };
