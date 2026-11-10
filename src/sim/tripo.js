// The Tripo monsters on the sim thread (src/core/tripo-monsters.js says who and where). A few slots in the knights' list take
// whoever lives at the lairs near you: stepTripo fills them as you come near a lair and lets them go when you're long gone.
// An empty slot is a TripoEmpty: dead, dormant, never drawn. A full one is a TripoMonster, a FieldCreature with more to it:
// several attacks, a breath, a bolt, wings, and the dolls that only move while you aren't looking at them.
import { ArmsRig } from './anim.js';
import { FieldCreature } from './field-creature.js';
import { foeOf } from './foes.js';
import { FOE } from './foespells.js';
import { ELEM, FX } from './spells.js';
import { parseGLB } from '../core/glb.js';
import { C, C_HERO, C_PROPS, EV } from '../core/layout.js';
import { clamp, mat4FromQT, quatMul, quatRotate, quatYaw, wrapAngle } from '../core/math.js';
import { OPENING } from '../core/opening.js';
import { inTown } from '../core/town.js';
import { ARMS, BREATH_ELEM, GROUPS, LAIRS, MODEL_STATS, TRIPO_BASE, armIds, kindOfGroup } from '../core/tripo-monsters.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const STATE = { MOVE: 0, ATTACK: 3, BREATH: 4, ROAR: 5, CAST: 6, DEAD: 10 };
// Attacks longer than this are left out: a six-second combo is a dance, not a blow.
const LONGEST_BLOW = 3.6;
const HUMAN_SPHERES = [['Hips', 0.13], ['Spine2', 0.14], ['Head', 0.09], ['LeftUpLeg', 0.08], ['RightUpLeg', 0.08], ['LeftLeg', 0.07], ['RightLeg', 0.07],
  ['LeftArm', 0.07], ['RightArm', 0.07], ['LeftForeArm', 0.06], ['RightForeArm', 0.06]];

// ---- models ------------------------------------------------------------------------------------------------------

const rigs = new Map();   // id -> Promise of a rig, the clips made ready for the game; kept, newest last
const RIGS_KEPT = 14;

function prepare(id, meta, buffer) {
  const glb = parseGLB(buffer);
  const acc = glb.json.accessors[glb.json.meshes[0].primitives[0].attributes.POSITION];
  const top = meta.rigTop || (acc.max[1] - acc.min[1]);
  const scale = meta.height / top;
  const rig = new ArmsRig(buffer, scale);
  rig.lift = -acc.min[1] * scale;
  rig.meta = meta;
  // Where it is at rest, joint by joint, for the spheres a blade tests against.
  const wq = new Float32Array(rig.count * 4), wt = new Float32Array(rig.count * 3);
  for (let j = 0; j < rig.count; j++) {
    const p = rig.parent[j];
    if (p < 0) { wq.set(rig.restR.subarray(j * 4, j * 4 + 4), j * 4); wt.set(rig.restT.subarray(j * 3, j * 3 + 3), j * 3); continue; }
    quatRotate(wt, j * 3, wq, p * 4, rig.restT, j * 3);
    wt[j * 3] += wt[p * 3]; wt[j * 3 + 1] += wt[p * 3 + 1]; wt[j * 3 + 2] += wt[p * 3 + 2];
    quatMul(wq, j * 4, wq, p * 4, rig.restR, j * 4);
  }
  const H = meta.height;
  const byEnd = (end) => rig.names.findIndex((n) => n === 'mixamorig:' + end || n.endsWith(':' + end));
  let spheres = HUMAN_SPHERES.map(([n, r]) => ({ j: byEnd(n), r: r * H })).filter((s) => s.j >= 0);
  if (spheres.length < 6) {
    // Not a body like ours: spheres spread over the whole skeleton, the farthest from each other first.
    const chosen = [0];
    const want = meta.kind === 'dragon' ? 16 : meta.kind === 'worm' ? 12 : 10;
    while (chosen.length < Math.min(want, rig.count)) {
      let best = -1, bd = -1;
      for (let j = 0; j < rig.count; j++) {
        let d = 1e9;
        for (const c of chosen) d = Math.min(d, Math.hypot(wt[j * 3] - wt[c * 3], wt[j * 3 + 1] - wt[c * 3 + 1], wt[j * 3 + 2] - wt[c * 3 + 2]));
        if (d > bd) { bd = d; best = j; }
      }
      chosen.push(best);
    }
    spheres = chosen.map((j) => ({ j, r: H * (meta.kind === 'dragon' ? 0.1 : 0.13) }));
  }
  rig.spheres = spheres;
  // The joint the clips carry the body forward by: the highest one that moves. Its travel comes off, and the body walks it instead.
  const depth = (j) => { let d = 0; for (let p = rig.parent[j]; p >= 0; p = rig.parent[p]) d++; return d; };
  const loco = rig.clips.walk || rig.clips.run || rig.clips.idle;
  let root = -1;
  for (let j = 0; j < rig.count; j++) if (loco?.trs[j] && (root < 0 || depth(j) < depth(root))) root = j;
  const human = Math.sqrt(H / 1.8);
  for (const clip of Object.values(rig.clips)) {
    clip.loop = /^(idle|walk|run|fly)/.test(clip.name);
    const track = root >= 0 ? clip.trs[root] : null;
    let travel = 0;
    if (track) {
      const x = track[0], z = track[2];
      const dx = track[track.length - 3] - x, dz = track[track.length - 1] - z;
      travel = Math.hypot(dx, dz);
      for (let f = 0; f < clip.frames; f++) {
        const k = f / (clip.frames - 1);
        track[f * 3] -= dx * k;
        track[f * 3 + 2] -= dz * k;
      }
    }
    const still = /^run/.test(clip.name) ? 4 * human : /^fly/.test(clip.name) ? 6 * human : 1.4 * human;
    clip.speed = travel / clip.dur > 0.4 ? travel / clip.dur : still;
  }
  rig.attacks = Object.keys(rig.clips).filter((n) => /^atk\d$/.test(n) && rig.clips[n].dur <= LONGEST_BLOW);
  if (!rig.attacks.length) rig.attacks = Object.keys(rig.clips).filter((n) => /^atk\d$/.test(n));
  rig.idles = Object.keys(rig.clips).filter((n) => /^idle\d?$/.test(n));
  rig.deaths = Object.keys(rig.clips).filter((n) => /^death\d?$/.test(n));
  const hand = byEnd('RightHand'), handL = byEnd('LeftHand');
  rig.hand = hand >= 0 ? hand : null;
  rig.handL = handL >= 0 ? handL : null;
  const mouth = meta.mouth ? rig.index.get(meta.mouth) : rig.names.findIndex((n) => /Head$/.test(n));
  rig.mouth = mouth >= 0 ? mouth : null;
  return rig;
}

function rigFor(id, meta, base) {
  let r = rigs.get(id);
  if (r) { rigs.delete(id); rigs.set(id, r); return r; }
  r = fetch(`${base}${TRIPO_BASE}${id}.glb`).then((res) => {
    if (!res.ok) throw new Error(`${id}: ${res.status}`);
    return res.arrayBuffer();
  }).then((b) => prepare(id, meta, b));
  rigs.set(id, r);
  while (rigs.size > RIGS_KEPT) rigs.delete(rigs.keys().next().value);
  return r;
}

// ---- an empty slot -----------------------------------------------------------------------------------------------

export class TripoEmpty {
  constructor(id) {
    Object.assign(this, { id, kind: 0, dead: true, dormant: true, looted: true, hostile: false, hp: 0, maxHp: 1, x: 0, y: -500, z: 0, yaw: 0,
      vx: 0, vz: 0, scale: 1, gashes: [], bleeds: [], spheres: [], opts: { radius: 0.5, height: 1, name: '' } });
  }

  update() {}
  reset() {}
  rayPlates() { return false; }
  onHit() {}
  observeSwing() {}
  writeGashes() {}
  write(snap, cOff) { snap[cOff + C.ACTIVE] = 0; snap[cOff + C.CUT] = 0; }
}

// ---- a monster ---------------------------------------------------------------------------------------------------

let gashSeries = 1;
const handM = new Float32Array(16);

export class TripoMonster extends FieldCreature {
  constructor(id, rig, opts) {
    super(id, rig, opts);
    this.meta = rig.meta;
    this.spheres = rig.spheres;
    this.pal = opts.pal;
    this.modelIndex = opts.modelIndex;
    // (A new body in an old slot: its wounds start from a number the render thread hasn't seen.)
    this.gashVersion = (gashSeries += 1000);
    this.home = [opts.spawn[0], opts.spawn[1]];
    this.hover = 0;
    this.buried = this.meta.kind === 'worm';
    this.idleClip = pick(rig.idles) || 'idle';
    this.idleT = rnd(1, 4);
    this.breathCd = rnd(1, 3);
    this.castCd = rnd(1, 2.5);
    this.burn = 0;
    this.blobs = [];
    this.setClip(this.idleClip);
    this.chunks = null;
  }

  // Seen: the player's looking this way, and could see it.
  watched(sim, p) {
    if (p !== sim.player) return false;
    const dx = this.x - p.x, dz = this.z - p.z, d = Math.hypot(dx, dz) || 1;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    return (dx * fx + dz * fz) / d > 0.62 && sim.world.sees(p.x, p.y + 1.6, p.z, this.x, this.y + this.meta.height * 0.6, this.z);
  }

  update(dt, sim) {
    if (dt <= 0) return;
    const p = foeOf(this, sim), o = this.opts, rig = this.rig, ai = o.ai;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.breathCd -= dt; this.castCd -= dt;
    this.flinch = Math.max(0, this.flinch - dt);
    this.fade = Math.min(1, this.fade + dt * 5);
    this.heart += dt;
    if (this.bleeds.length && !this.dead) this.hp -= dt * this.bleeds.reduce((sum, b) => sum + b.rate, 0) * 3;
    if (this.hp <= 0 && !this.dead) this.die(sim);
    const distance = Math.hypot(p.x - this.x, p.z - this.z);
    const yaw = Math.atan2(p.x - this.x, p.z - this.z);
    const story = sim.opening && sim.opening.stage < OPENING.ARRIVED;
    const canHunt = !story && !p.dead && sim.gameState === 0 && !inTown(p.x, p.z, -4);
    const sight = o.sight;
    if (canHunt && !this.aggro && distance < sight && (distance < 6 || sim.world.sees(this.x, this.y + 1.2, this.z, p.x, p.y + 1, p.z))) this.notice(sim);
    const fromHome = Math.hypot(this.x - this.home[0], this.z - this.home[1]);
    if (!canHunt || distance > sight * 2 || fromHome > o.leash) this.aggro = false;
    let speed = 0;
    const clipOf = (n) => rig.clips[n];
    const frac = () => this.t / clipOf(this.clip).dur;
    // The dolls and the night demons: still as stone while you look at them.
    const frozen = ai === 'stalker' && this.aggro && !this.dead && this.watched(sim, p);
    if (this.dead) {
      this.deadT += dt;
      this.t = Math.min(clipOf(this.clip).dur, this.t + dt);
      this.burn = 0;
    } else if (frozen) {
      // (Caught mid-step: nothing moves, not even the clip.)
    } else if (this.state === STATE.ROAR) {
      this.t += dt;
      if (this.t >= this.roarFor) { this.state = STATE.MOVE; this.buried = false; }
    } else if (this.state === STATE.ATTACK) {
      this.t += dt * (this.flinch > 0 ? 0.35 : 1) * this.rate;
      const f = frac();
      if (f < 0.3) this.yaw += clamp(wrapAngle(yaw - this.yaw), -dt * 3, dt * 3);
      if (f >= 0.32 && f <= 0.66 && !this.used && canHunt) {
        const reach = o.reach + (p.bodyRadius || 0.4);
        if (distance < reach && Math.abs(p.y - this.y - this.hover) < 1.6 + this.meta.height * 0.3
          && Math.abs(wrapAngle(yaw - this.yaw)) < 1.2 && sim.world.sees(this.x, this.y + 1, this.z, p.x, p.y + 1, p.z)) {
          this.used = true;
          if (p.damage(sim, o.damage, this.x, this.z, o.knock)) this.bites++;
        }
      }
      if (f >= 1) { this.state = STATE.MOVE; this.cooldown = rnd(0.6, 1.4) * o.pause; this.setClip(this.idleClip); }
    } else if (this.state === STATE.BREATH) {
      this.t += dt;
      this.yaw += clamp(wrapAngle(yaw - this.yaw), -dt * 1.2, dt * 1.2);
      const f = frac(), w = this.meta.breathWin || [0.25, 0.8];
      if (f > w[0] && f < w[1]) this.breathe(dt, sim, p);
      if (f >= 1) { this.state = STATE.MOVE; this.breathCd = rnd(5, 9); this.cooldown = 0.6; this.setClip(this.idleClip); }
    } else if (this.state === STATE.CAST) {
      this.t += dt;
      this.yaw += clamp(wrapAngle(yaw - this.yaw), -dt * 4, dt * 4);
      if (!this.used && frac() >= 0.45) { this.used = true; this.loose(sim, p, distance); }
      if (frac() >= Math.min(1, 1.6 / clipOf(this.clip).dur)) { this.state = STATE.MOVE; this.castCd = rnd(2.2, 3.4); this.setClip(this.idleClip); }
    } else {
      let tx, tz, walk = false, want = null;
      if (this.aggro) {
        tx = p.x; tz = p.z;
        const reachNow = o.reach * 0.9 + (p.bodyRadius || 0.4);
        // Up on a ledge or down a drop, out of a claw's reach: breathe at it instead, and don't swing at the air.
        const reachable = Math.abs(p.y - this.y - this.hover) < 1.6 + this.meta.height * 0.3;
        const canBreathe = ai === 'breather' && rig.clips.breath && this.breathCd <= 0 && (distance > o.reach || !reachable) && distance < o.breathRange
          && sim.world.sees(this.x, this.y + this.meta.height * 0.6, this.z, p.x, p.y + 1, p.z);
        const canCast = ai === 'caster' && this.castCd <= 0 && distance > 3.5 && distance < 22 && sim.world.sees(this.x, this.y + 1.5, this.z, p.x, p.y + 1, p.z);
        if (canBreathe) { this.state = STATE.BREATH; this.setClip(rig.clips.breath2 && Math.random() < 0.4 ? 'breath2' : 'breath'); }
        else if (canCast) { this.state = STATE.CAST; this.used = false; this.setClip(pick(rig.attacks)); sim.event(EV.CHANT, this.x, this.y + 1.5, this.z); }
        else if (distance < reachNow && reachable && this.cooldown <= 0 && rig.attacks.length) {
          this.state = STATE.ATTACK; this.used = false;
          this.setClip(pick(rig.attacks));
          this.rate = clamp(clipOf(this.clip).dur / 1.6, 1, 1.8);
          sim.event(EV.GRUNT, this.x, this.y + 1.1, this.z, 2);
        } else if (ai === 'caster' && distance < 8) {
          // Back off to a spell's distance.
          tx = this.x - (p.x - this.x); tz = this.z - (p.z - this.z);
        } else if (distance < reachNow * 0.8) { tx = this.x; tz = this.z; }
        if (this.state === STATE.MOVE) {
          const flying = (ai === 'flyer' || this.meta.kind === 'dragon') && rig.clips.fly && distance > (this.meta.kind === 'dragon' ? 22 : o.reach * 2.5);
          want = flying ? 'fly' : rig.clips.run ? 'run' : 'walk';
          speed = this.flinch > 0 ? 0 : o.speed * (flying ? 1.25 : 1);
          if (Math.hypot(tx - this.x, tz - this.z) < 0.3) { speed = 0; want = this.idleClip; }
        }
      } else {
        // Wander about home: stand a while, then walk to the next corner of a small square round it.
        const angle = this.waypoint * Math.PI / 2 + this.id;
        tx = this.home[0] + Math.sin(angle) * o.roam;
        tz = this.home[1] + Math.cos(angle) * o.roam;
        if (fromHome > o.roam * 2.5) { tx = this.home[0]; tz = this.home[1]; walk = true; }
        if (this.idleT > 0) { this.idleT -= dt; want = this.idleClip; }
        else {
          walk = true;
          if (Math.hypot(tx - this.x, tz - this.z) < 0.8) { this.waypoint = (this.waypoint + 1) % 4; this.idleT = rnd(2, 6); this.idleClip = pick(rig.idles) || 'idle'; }
        }
        if (walk) { want = rig.clips.walk ? 'walk' : 'run'; speed = o.speed * 0.3; }
        if (this.buried) { want = null; speed = 0; }
      }
      if (want) {
        if (speed > 0) {
          sim.world.updateField(tx, tz, sim.time, `t${this.id}`);
          const flow = this.flow;
          sim.world.flow(flow, this.x, this.z, tx, tz, `t${this.id}`);
          this.vx = flow[0] * speed; this.vz = flow[1] * speed;
          if (Math.hypot(flow[0], flow[1]) > 0.1) this.yaw += clamp(wrapAngle(Math.atan2(flow[0], flow[1]) - this.yaw), -dt * 3.5, dt * 3.5);
        } else {
          this.vx = this.vz = 0;
          if (this.aggro) this.yaw += clamp(wrapAngle(yaw - this.yaw), -dt * 3, dt * 3);
        }
        this.setClip(want);
        const clip = clipOf(this.clip);
        this.t += dt * (speed > 0 ? clamp(speed / clip.speed, 0.4, 1.8) : 1);
      }
    }
    if (this.dead || this.state !== STATE.MOVE || frozen) this.vx = this.vz = 0;
    if (!this.dead) {
      const pos = this.position;
      pos[0] = this.x + this.vx * dt; pos[1] = this.y; pos[2] = this.z + this.vz * dt;
      sim.world.resolve(pos, o.radius, this.y + 0.2);
      this.x = pos[0]; this.z = pos[2];
    }
    this.speed = Math.hypot(this.vx, this.vz);
    this.y = sim.world.height(this.x, this.z);
    // Wings: up off the ground as the move says (roster.json hover, as a share of the height).
    const lift = this.dead ? 0 : (this.meta.hover?.[this.clip] || 0) * this.meta.height;
    this.hover += (lift - this.hover) * Math.min(1, dt * 2.5);
    this.stepBlobs(dt, sim);
    quatYaw(this.rig.rootQ, 0, this.yaw);
    this.rig.rootT[0] = this.x; this.rig.rootT[1] = this.y + this.rig.lift + this.hover; this.rig.rootT[2] = this.z;
  }

  notice(sim) {
    this.aggro = true;
    for (const k of sim.knights) if (k instanceof TripoMonster && k !== this && k.lair === this.lair && !k.dead) k.aggro = true;
    sim.event(EV.BEAST_NOTICE, this.x, this.y + this.meta.height * 0.8, this.z);
    // The big ones roar first; the worm comes up out of the ground.
    const big = this.meta.kind === 'dragon' || this.meta.kind === 'worm';
    if (this.state === STATE.MOVE && (big || (this.boss && this.rig.clips.roar))) {
      const clip = this.buried && this.rig.clips.emerge ? 'emerge' : this.rig.clips.roar ? 'roar' : null;
      if (clip) {
        this.state = STATE.ROAR; this.setClip(clip);
        this.roarFor = Math.min(this.rig.clips[clip].dur, clip === 'emerge' ? 4 : 2.6);
        sim.event(EV.ROAR, this.x, this.y + this.meta.height * 0.7, this.z, big ? 1.6 : 1);
      } else this.buried = false;
    }
  }

  // Where the mouth is, and which way the breath leaves it (along the body, tipped down at what it's after).
  mouthAt(out, p) {
    const { wt } = this.rig, m = this.rig.mouth;
    if (m === null) { out[0] = this.x; out[1] = this.y + this.meta.height * 0.8; out[2] = this.z; }
    else { out[0] = wt[m * 3]; out[1] = wt[m * 3 + 1]; out[2] = wt[m * 3 + 2]; }
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const d = Math.max(1, Math.hypot(p.x - out[0], p.z - out[2]));
    const dy = clamp((p.y + 0.9 - out[1]) / d, -0.8, 0.3);
    const L = Math.hypot(1, dy);
    out[3] = fx / L; out[4] = dy / L; out[5] = fz / L;
    return out;
  }

  breathe(dt, sim, p) {
    const m = this.mouthAt(this.mouthBuf || (this.mouthBuf = new Float32Array(6)), p), o = this.opts;
    // Fire goes out as the Hydra's does (EV.FIRE: its sparks and roar, src/main.js). Poison, rot and acid as clouds that drift on.
    this.blobClock = (this.blobClock || 0) - dt;
    if (o.breathElem === ELEM.FIRE) {
      while (this.blobClock <= 0) {
        this.blobClock += 0.05;
        sim.event(EV.FIRE, m[0], m[1], m[2], m[3], m[4], m[5]);
        if (m[4] < -0.06) { const t = (m[1] - this.y) / -m[4]; if (t < o.breathRange) sim.event(EV.FIRE_HIT, m[0] + m[3] * t, this.y + 0.05, m[2] + m[5] * t); }
      }
    }
    while (this.blobClock <= 0) {
      this.blobClock += 0.045;
      const s = o.breathSpeed * rnd(0.85, 1.1), spread = 0.12;
      const dx = m[3] + rnd(-spread, spread), dy = m[4] + rnd(-spread, spread) * 0.6, dz = m[5] + rnd(-spread, spread);
      this.blobs.push({ x: m[0], y: m[1], z: m[2], vx: dx * s, vy: dy * s, vz: dz * s, age: 0, life: o.breathRange / o.breathSpeed, seed: Math.random() });
    }
    // What's in the cone takes it, a share a tick, in bites so the hurt isn't a flicker.
    const dx = p.x - m[0], dz = p.z - m[2], d = Math.hypot(dx, dz);
    if (d < o.breathRange && d > 0.1 && (dx * m[3] + dz * m[5]) / (d * Math.hypot(m[3], m[5])) > 0.88
      && Math.abs(p.y + 1 - (m[1] + m[4] * d)) < 2 + d * 0.15 && sim.world.sees(m[0], m[1], m[2], p.x, p.y + 1, p.z)) {
      this.burn += o.breathDps * dt;
      if (this.burn > o.breathDps * 0.25) {
        p.damage(sim, this.burn, this.x, this.z, 0.6, true);
        this.burn = 0;
        if (o.breathElem === ELEM.FIRE) sim.event(EV.BURN, p.x, p.y + 1, p.z);
      }
    }
  }

  stepBlobs(dt, sim) {
    if (!this.blobs.length) return;
    const c = sim.casting, e = this.opts.breathElem;
    this.blobs = this.blobs.filter((b) => {
      b.age += dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.vy += 1.2 * dt;     // the heat lifts it
      const g = sim.world.height(b.x, b.z);
      if (b.y < g + 0.15) { b.y = g + 0.15; b.vy = Math.abs(b.vy) * 0.2; b.vx *= 0.8; b.vz *= 0.8; }
      if (b.age > b.life || sim.world.inside(b.x, b.z, 0.05)) return false;
      const k = b.age / b.life, size = (0.25 + k * 1.4) * this.opts.breathSize;
      c.fx(e === ELEM.FIRE ? FX.FLAME : FX.PUFF, e, b.x, b.y, b.z, size, b.vx, b.vy, b.vz, size * 1.4, (1 - k) * 0.95, k < 0.1 ? 10 : 0, 6, 0, b.seed);
      return true;
    });
  }

  // A necromancer's bolt, from the right hand.
  loose(sim, p, d) {
    const { wt } = this.rig, h = this.rig.hand;
    const at = h === null ? [this.x, this.y + 1.5, this.z] : [wt[h * 3], wt[h * 3 + 1], wt[h * 3 + 2]];
    sim.foeTarget = p === sim.player ? null : p;
    try { FOE.bolt.fire(this, sim, p, d, null, at); } finally { sim.foeTarget = null; }
  }

  onHit(sim) {
    this.flinch = 0.18;
    if (!this.aggro && sim) this.notice(sim);
    this.aggro = true;
    this.buried = false;
  }

  rayPlates(...a) { return this.buried ? false : super.rayPlates(...a); }

  die() {
    this.dead = true; this.hp = 0; this.state = STATE.DEAD; this.deadT = 0;
    this.vx = this.vz = 0; this.blobs.length = 0;
    if (this.lair) this.lair.killed++;
    this.setClip(pick(this.rig.deaths) || 'death');
  }

  write(snap, cOff, sim) {
    if (this.buried) { snap[cOff + C.ACTIVE] = 0; snap[cOff + C.CUT] = 0; return; }
    super.write(snap, cOff, sim);
    snap[cOff + C.MODEL] = this.modelIndex + 1;
    snap[cOff + C.PAL] = this.pal;
    snap[cOff + C.CUT] = 0;
    // What's in its hands: which (ARMS in src/core/tripo-monsters.js), and each hand's frame. The render thread bakes the grip
    // into the weapon's own mesh (src/gfx/tripo-slots.js), so a hand's frame is all it needs from here.
    snap[cOff + C_HERO + ARMS.RIGHT] = this.opts.armR;
    snap[cOff + C_HERO + ARMS.LEFT] = this.opts.armL;
    const { wq, wt } = this.rig;
    const hold = (j, o) => { if (j === null) snap.fill(0, o, o + 16); else mat4FromQT(handM, wq, j * 4, wt, j * 3), snap.set(handM, o); };
    hold(this.opts.armR ? this.rig.hand : null, cOff + C_PROPS);
    hold(this.opts.armL ? this.rig.handL : null, cOff + C_PROPS + 16);
  }

  writeGashes(snap, cOff, sim) { if (!this.buried) super.writeGashes(snap, cOff, sim); }
}

// ---- the lairs ---------------------------------------------------------------------------------------------------

export class TripoWorld {
  constructor(sim, base, roster, palettes, first, count) {
    this.sim = sim; this.base = base; this.roster = roster;
    this.ids = Object.keys(roster);
    this.arms = armIds(roster);
    this.palNames = Object.keys(palettes);
    this.first = first; this.count = count;
    this.lairs = LAIRS.map((l) => ({ ...l, wake: l.wake || 110, state: 'asleep', at: -1e9, left: null }));
    this.nextLook = 0;
    this.loading = new Set();
  }

  slots() { return this.sim.knights.slice(this.first, this.first + this.count); }

  // A new game: every slot empty, every lair waiting.
  reset() {
    for (let i = this.first; i < this.first + this.count; i++) this.sim.knights[i] = new TripoEmpty(i);
    this.lairs = this.lairs.filter((l) => l.key !== 'test');
    this.nextLook = 0; this.claimed?.clear(); this.loading.clear();
    for (const l of this.lairs) { l.state = 'asleep'; l.at = -1e9; }
  }

  // For tests and reviews: one of them (by its place in roster.json) stood at x, z, as a lair of its own.
  standHere(index, x, z) {
    const id = this.ids[index];
    if (!id) return;
    const p = this.sim.player;
    const lair = { key: 'test', x, z, r: 1, boss: [id], n: 0, pal: [this.testPal || 'Base'], wake: 1e9, state: 'asleep', at: -1e9, face: Math.atan2(p.x - x, p.z - z) };
    this.lairs.push(lair);
    this.wake(lair);
  }

  // Stats for one model at one lair.
  optsFor(id, lair, x, z, boss) {
    const meta = this.roster[id], g = GROUPS[meta.group] || GROUPS.Goblins, own = MODEL_STATS[id] || {};
    const s = { ...g, ...own };
    const H = meta.height;
    const pal = lair.pal[Math.floor(Math.random() * lair.pal.length)];
    const breath = meta.breath;
    return {
      name: s.name, model: id, kind: kindOfGroup(meta.group), scale: 1, spawn: [x, z], yaw: Math.random() * Math.PI * 2,
      hp: s.hp * (boss ? 1.25 : 1), speed: s.speed, damage: s.damage, reach: s.reach, ai: breath && s.ai !== 'caster' ? 'breather' : s.ai,
      radius: clamp(H * (meta.kind === 'dragon' ? 0.22 : meta.kind === 'spider' ? 0.38 : 0.2), 0.35, 1.8), height: H,
      lootKind: s.loot, knock: H > 3 ? 4 : H > 2 ? 2.5 : 1.5, pause: s.ai === 'melee' && H < 1.5 ? 0.7 : 1,
      sight: meta.kind === 'dragon' ? 48 : s.ai === 'stalker' ? 34 : 24, leash: meta.kind === 'dragon' ? 120 : 70, roam: lair.r * 0.6 + 2,
      breathRange: s.breathRange || 7, breathDps: s.breathDps || 12, breathElem: BREATH_ELEM[breath] ?? ELEM.FIRE,
      breathSpeed: 9 + H * 1.6, breathSize: 0.5 + H * 0.12,
      boltElem: /lord/.test(id) ? ELEM.VOID : pick([ELEM.DRAIN, ELEM.BONE, ELEM.POISON]),
      pal: Math.max(0, this.palNames.indexOf(pal)), modelIndex: this.ids.indexOf(id),
      // A weapon from its list for the right hand, a shield for the left (the bestiary's arm(): roster.json arms).
      armR: meta.arms?.right?.length ? this.arms.indexOf(pick(meta.arms.right)) + 1 : 0,
      armL: meta.arms?.left?.length ? this.arms.indexOf(pick(meta.arms.left)) + 1 : 0,
    };
  }

  // Once a second: wake the lairs you've come near, let go of the ones you've left.
  step() {
    const sim = this.sim, p = sim.player;
    if (sim.time < this.nextLook || (sim.opening && sim.opening.stage < OPENING.ARRIVED)) return;
    this.nextLook = sim.time + 1;
    for (const lair of this.lairs) {
      const d = Math.hypot(p.x - lair.x, p.z - lair.z);
      if (lair.state === 'cleared' && sim.time - lair.at > 600 && d > lair.wake * 2) lair.state = 'asleep';
      if (lair.state === 'awake') {
        const mine = this.slots().filter((k) => k instanceof TripoMonster && k.lair === lair);
        if (lair.spawned && lair.killed >= lair.spawned && !this.loading.has(lair)) { lair.state = 'cleared'; lair.at = sim.time; }
        else if (d > lair.wake * 2.2 && mine.every((k) => k.dead || !k.aggro)) this.sleep(lair);
        // Woke when every slot was busy, and so has nobody: try again next time round.
        else if (!lair.spawned && !mine.length && !this.loading.has(lair)) lair.state = 'asleep';
      } else if (lair.state === 'asleep' && d < lair.wake && !p.dead) this.wake(lair);
    }
  }

  sleep(lair) {
    lair.state = 'asleep';
    this.sim.knights.forEach((k, i) => { if (k instanceof TripoMonster && k.lair === lair) this.sim.knights[i] = new TripoEmpty(i); });
  }

  // A slot for one more: an empty one, or one whose body is long dead or far from you and doing nothing.
  freeSlot() {
    const sim = this.sim, p = sim.player;
    for (let i = this.first; i < this.first + this.count; i++) if (sim.knights[i] instanceof TripoEmpty && !this.claimed?.has(i)) return i;
    let best = -1, bd = 0;
    for (let i = this.first; i < this.first + this.count; i++) {
      const k = sim.knights[i];
      if (this.claimed?.has(i) || k.aggro) continue;
      const d = Math.hypot(k.x - p.x, k.z - p.z);
      const spare = k.dead ? (k.deadT > 45 || d > 60 ? 1e6 + d : -1) : d > 150 ? d : -1;
      if (spare > bd) { bd = spare; best = i; }
    }
    return best;
  }

  wake(lair) {
    const sim = this.sim;
    lair.state = 'awake';
    lair.spawned = 0; lair.killed = 0;
    const who = [];
    if (lair.boss) who.push([pick(lair.boss), true]);
    for (let i = 0; i < lair.n; i++) who.push([pick(lair.pick), false]);
    this.claimed = this.claimed || new Set();
    this.loading.add(lair);
    let pending = 0;
    who.forEach(([id, boss], n) => {
      const slot = this.freeSlot();
      if (slot < 0) return;
      this.claimed.add(slot);
      pending++;
      // Stood round the lair's middle, somewhere clear.
      let x = lair.x, z = lair.z;
      for (let t = 0; t < 12; t++) {
        const a = n * 2.4 + t * 0.9, r = n === 0 && boss ? 0 : lair.r * (0.4 + 0.6 * Math.random());
        x = lair.x + Math.sin(a) * r; z = lair.z + Math.cos(a) * r;
        if (!sim.world.inside(x, z, 0.9) && !inTown(x, z, 4)) break;
      }
      rigFor(id, this.roster[id], this.base).then((rig) => {
        this.claimed.delete(slot);
        if (lair.state !== 'awake') return;
        const old = sim.knights[slot];
        if (old instanceof TripoMonster && (old.aggro || (!old.dead && Math.hypot(old.x - sim.player.x, old.z - sim.player.z) < 150))) return;
        const m = new TripoMonster(slot, rig, this.optsFor(id, lair, x, z, boss));
        m.lair = lair; m.boss = boss;
        if (lair.face !== undefined) { m.yaw = lair.face; m.idleT = 1e9; }
        lair.spawned++;
        m.y = sim.world.height(x, z);
        sim.knights[slot] = m;
      }).catch((e) => { this.claimed.delete(slot); console.error('tripo', id, e); })
        .finally(() => { if (--pending === 0) this.loading.delete(lair); });
    });
    if (!pending) this.loading.delete(lair);
  }
}
