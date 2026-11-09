// The other Tessariels, as bodies: AI adventurers living their own MMO in Bellmourn (see src/core/heroes.js for who they are
// and how to send them somewhere new). Each is a knight on the UAL skeleton (src/sim/knight.js does the layered animation,
// the hands and the ground) with a brain of its own: what to do with the day, who to do it with, and how its class fights.
//
// They are not in sim.knights, so nothing of the player's (spells, blows, loot) ever touches them. Monsters they strike
// turn on them (src/sim/foes.js). What they say is chosen on the render thread (src/ui/heroes.js) from the triggers they
// raise here as EV.HERO events: (slot, trigger, other slot, place, mob, extra).
import { CAUSES, CLASSES, MOVE_KEYS, DELVES, GESTURES, LONG_ROAD, MOBS, MOB_KEYS, PERSONAS, PLACES, PLACE_IDS, THE_FALL, ACTIVITIES, TRIG, WALK_ENDS, hourBand, placeOf, rng } from '../core/heroes.js';
import { C, C_HERO, C_PROPS, EV } from '../core/layout.js';
import { clamp, damp, mat4FromQT, quatMul, quatRotate, wrapAngle } from '../core/math.js';
import { floorAt, inPit } from '../core/interior.js';
import { ELEM, FX } from './spells.js';
import { Knight, S, matToQuat, norm, orth, cross, turn } from './knight.js';
import { Caster, TOWN_R, Zombie } from './undead.js';
import { Crab } from './crab.js';
import { Gravehart } from './gravehart.js';
import { Hydra } from './hydra.js';
import { FieldCreature } from './field-creature.js';
import { Pose, solveFK } from './anim.js';

const STRING_ELEM = { gold: ELEM.LIGHT, azure: ELEM.FROST, emerald: ELEM.HEAL, violet: ELEM.ARCANE, crimson: ELEM.DRAIN, silver: ELEM.SPIRIT, ember: ELEM.FIRE, rose: ELEM.STORM };
const GAP = 1.2;                 // hips to hips, hero to anything
const VIEW = 170;                // past this from the player a hero isn't drawn, and only thinks
const RESPAWN = [150, 300];      // seconds before something a hero killed stands again, MMO-style
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// What a monster is, to a hero.
export function mobKind(m) {
  if (m instanceof Hydra) return 'hydra';
  if (m instanceof Gravehart) return 'gravehart';
  if (m instanceof Crab) return 'crab';
  if (m instanceof FieldCreature) return m.opts.name === 'WEREWOLF' ? 'werewolf' : 'mouth';
  if (m instanceof Caster) return m.opts.role === 'wizard' ? 'wizard' : m.opts.role;
  if (m instanceof Zombie) return m.opts.model === 'zombie_ogre' ? 'ogre' : m.champion ? 'champion' : 'zombie';
  if (m instanceof Knight) return m.opts.suit === 'knight' ? 'sentry' : 'black_knight';
  return null;
}

// Standing, outdoors, and something a hero can reach.
function fightable(m) {
  if (!m || m.dead || m.dormant || m.hp <= 0 || m instanceof Hydra || m instanceof Hero) return false;
  if (m instanceof Knight) return m.kind === 0;
  return floorAt(m.x, m.z) === null && !inPit(m.x, m.z);
}

const radiusOf = (m) => (m instanceof Gravehart ? 2.2 : m instanceof FieldCreature ? 1 : m.scale > 1.2 ? 1 : m instanceof Crab ? 1.4 : 0.5);

// ---- class moves ----------------------------------------------------------------------------------------------------
// clip: from the heroes' bank. hit: when in the clip it lands (fractions). dmg: before level. reach: past the hips.
const BLOWS = {
  two_hand: [{ clip: 'Sword_Attack', rate: 0.95, hit: [0.24], dmg: 16, reach: 2.4 }, { clip: 'L_Chop', rate: 1.0, hit: [0.6], dmg: 15, reach: 2.3 }, { clip: 'Sword_Regular_C', rate: 0.9, hit: [0.33], dmg: 14, reach: 2.5 }],
  sword_board: [{ clip: 'Sword_Regular_A', rate: 0.8, hit: [0.55], dmg: 10, reach: 2.1 }, { clip: 'Sword_Regular_B', rate: 0.8, hit: [0.48], dmg: 10, reach: 2.0 }, { clip: 'L_ShieldJab', rate: 1.1, hit: [0.55], dmg: 6, reach: 1.5, knock: 4 }],
  lance: [{ clip: 'Sword_Regular_C', rate: 0.85, hit: [0.33], dmg: 14, reach: 3.1 }, { clip: 'L_ShieldJab', rate: 1.1, hit: [0.55], dmg: 7, reach: 1.6, knock: 5 }, { clip: 'Sword_Regular_A', rate: 0.8, hit: [0.55], dmg: 11, reach: 2.9 }],
  daggers: [{ clip: 'Punch_Jab', rate: 1.2, hit: [0.4], dmg: 6, reach: 1.4 }, { clip: 'Punch_Cross', rate: 1.2, hit: [0.42], dmg: 7, reach: 1.4 }, { clip: 'Melee_Hook', rate: 0.9, hit: [0.5], dmg: 8, reach: 1.4 }, { clip: 'L_Slash', rate: 1.15, hit: [0.65], dmg: 9, reach: 1.6 }],
  spear: [{ clip: 'Sword_Regular_C', rate: 0.9, hit: [0.33], dmg: 13, reach: 2.9 }, { clip: 'L_Chop', rate: 1.0, hit: [0.6], dmg: 12, reach: 2.4 }, { clip: 'Sword_Regular_Combo', rate: 0.85, hit: [0.08, 0.24, 0.51], dmg: 7, reach: 2.6 }],
  boomerang: [{ clip: 'Punch_Jab', rate: 1.15, hit: [0.4], dmg: 6, reach: 1.4 }, { clip: 'L_SnapKick', rate: 1.1, hit: [0.6], dmg: 6, reach: 1.6, knock: 5 }],
  blade: [{ clip: 'Sword_Regular_A', rate: 0.85, hit: [0.55], dmg: 9, reach: 2.0 }, { clip: 'Sword_Regular_B', rate: 0.85, hit: [0.48], dmg: 9, reach: 1.9 }, { clip: 'L_Slash', rate: 1.1, hit: [0.65], dmg: 10, reach: 2.0 }],
  bow: [{ clip: 'L_SnapKick', rate: 1.1, hit: [0.6], dmg: 5, reach: 1.6, knock: 6 }],
  ninja: [{ clip: 'L_SnapKick', rate: 1.15, hit: [0.6], dmg: 8, reach: 1.7, knock: 4 }, { clip: 'Punch_Jab', rate: 1.25, hit: [0.4], dmg: 6, reach: 1.4 }, { clip: 'Punch_Cross', rate: 1.25, hit: [0.42], dmg: 7, reach: 1.4 }, { clip: 'LP_front_kick_01', rate: 1.1, hit: [0.45], dmg: 8, reach: 1.7 }],
};

// What a class's ordinary blows are called, for the words (class_skill).
const BLOW_MOVE = { lancer: 'lance_thrust', archer: 'aimed_shot', rogue: 'flurry', ninja: 'ninja_flurry', dragoon: 'spear_combo', boomerang: 'throw', paladin: null, bard: null };

// Each class's special moves: how often, and what they need. The words name them by these keys (class_skill, extra).
export const SKILLS = {
  paladin: [{ key: 'hammer_throw', cd: 7, range: [3, 16] }, { key: 'blessed_hammers', cd: 14, range: [0, 5], crowd: 2 }, { key: 'consecration', cd: 18, range: [0, 4], undead: true }, { key: 'holy_light', cd: 9, heal: true }],
  lancer: [{ key: 'charge', cd: 9, range: [5, 14] }, { key: 'shield_wall', cd: 16, range: [0, 6], crowd: 3 }],
  archer: [{ key: 'volley', cd: 11, range: [6, 20], crowd: 2 }],
  rogue: [{ key: 'vanish', cd: 13, range: [0, 8] }],
  ninja: [{ key: 'throwing_stars', cd: 6, range: [4, 15] }, { key: 'shadow_step', cd: 9, range: [4, 14] }],
  dragoon: [{ key: 'jump', cd: 13, range: [3, 14] }],
  boomerang: [{ key: 'double_throw', cd: 10, range: [4, 13] }],
  bard: [{ key: 'war_song', cd: 30, song: true }, { key: 'marching_song', cd: 40, song: true, travel: true }, { key: 'mending_song', cd: 26, song: true, heal: true }],
};

// ---- the body -------------------------------------------------------------------------------------------------------

export class Hero extends Knight {
  constructor(slot, rig, bank, person, props) {
    const cls = CLASSES[person.cls];
    super(100 + slot, 1, rig, bank, { spawn: [-1.5 + Math.sin(slot) * 6, 4 + Math.cos(slot) * 6], yaw: slot, hp: cls.hp, style: 'silver', swordScale: 1, shieldScale: 1, bladeLen: 1, walk: 1.4, hero: true });
    this.slot = slot; this.person = person; this.cls = cls; this.style = person.kit.style;
    this.bodyRadius = 0.42;
    this.propMatrices = new Float32Array(48);
    const P = (id) => (id ? { id, ...props[id] } : null);
    this.mainP = P(person.kit.main); this.offP = P(person.kit.off); this.backP = P(person.kit.back);
    this.shieldStyle = this.style === 'lance' || this.style === 'sword_board';
    this.stringElem = STRING_ELEM[person.kit.string] ?? ELEM.LIGHT;
    this.blows = this.style === 'daggers' && person.cls === 'ninja' ? BLOWS.ninja : BLOWS[this.style] || BLOWS.blade;
    this.skills = (SKILLS[person.cls] || []).map((s) => ({ ...s, t: rand(2, s.cd) }));
    this.lean = PERSONAS[person.persona] || PERSONAS.earnest;
    this.r = rng(person.seed);
    // The left hand's grip, as the right's is for the sword: an item held in the left fist (a dagger, a boomerang).
    const grip = bank.grip.l;
    const frame = (y, z) => { const yy = norm(y), zz = norm(orth(z, yy)); return matToQuat(cross(yy, zz), yy, zz); };
    const k = grip.knuckles, f = grip.fingers;
    const len = Math.hypot(...rig.restT.subarray(rig.index.get('middle_01_l') * 3, rig.index.get('middle_01_l') * 3 + 3));
    this.offQ = new Float32Array(frame([k[0] * 0.95 + f[0] * 0.31, k[1] * 0.95 + f[1] * 0.31, k[2] * 0.95 + f[2] * 0.31], f));
    this.offT = new Float32Array([f[0] * len * 0.66 + grip.palm[0] * len * 0.3, f[1] * len * 0.66 + grip.palm[1] * len * 0.3, f[2] * len * 0.66 + grip.palm[2] * len * 0.3]);
    // Where the board rides on the back, found once on this body standing at rest, then kept by the chest.
    {
      const pose = new Pose(rig);
      pose.rot.set(rig.restR); pose.pelvis.set(bank.pelvisRest);
      bank.sample(bank.clips.Idle_Loop, 0, pose.rot, pose.pelvis);
      solveFK(pose, 0, 0, 0, 0, null, null);
      const j = this.J.spine3, sq = pose.wq.subarray(j * 4, j * 4 + 4), inv = [-sq[0], -sq[1], -sq[2], sq[3]];
      // The board: its back to his back, its face out behind him, standing up and a little leaned, slung low.
      const B = frame([0.12, 1, 0.05], [0, 0.1, 1]);
      this.backQ = new Float32Array(4); quatMul(this.backQ, 0, inv, 0, B, 0);
      const at = [0.08, pose.wt[j * 3 + 1] - 0.22 * rig.height / 1.8, -0.2 - (this.backP?.kind === 'tower' ? 0.04 : 0)];
      const d = [at[0] - pose.wt[j * 3], at[1] - pose.wt[j * 3 + 1], at[2] - pose.wt[j * 3 + 2]];
      this.backT = new Float32Array(3); quatRotate(this.backT, 0, inv, 0, d, 0);
    }
    this.flight = null;     // a boomerang or a hammer on its way
    this.heroReset();
  }

  heroReset() {
    Object.assign(this, {
      task: null, goal: null, party: null, foe: null, swing: null, hold: 0, holdFace: null, gestureT: 0, idleT: rand(2, 12),
      hidden: false, below: 0, ghostT: 0, surf: null, air: 0, airV: 0, jump: null, buff: null, buffT: 0, hurtSay: false,
      kills: 0, bag: 0, xp: 0, stuckT: 0, lastX: this.x, lastZ: this.z, meetT: rand(10, 40), lastSay: -99, aimT: 0, draw: 0,
      shotCd: 0, animTick: 0, losT: 0, clear: true, fieldAt: null, vanishT: 0, playerSeen: false, helpT: 0, visible: true, animT: 0, sitting: false,
    });
    this.hostile = false;
  }

  // ---- what others see of it ----

  get active() { return !this.hidden && !this.below; }

  say(sim, trig, other = -1, place = -1, mob = -1, extra = 0) {
    sim.event(EV.HERO, this.slot, TRIG[trig] ?? -1, other, place, mob, extra, 0);
    this.lastSay = sim.time;
  }

  // A hit from a monster (src/sim/undead.js and the beasts call the player's damage(); a hero answers the same way).
  damage(sim, amount, fromX, fromZ, knock = 0) {
    if (this.dead || !this.active || this.surf || this.iframes) return false;
    // Plate, mail or leather: a lancer shrugs off what a rogue can't. A raised shield takes most of it from the front.
    const armor = { lancer: 0.6, paladin: 0.7, dragoon: 0.8 }[this.person.cls] ?? 0.9;
    const front = Math.abs(wrapAngle(Math.atan2(fromX - this.x, fromZ - this.z) - this.faceYaw)) < 1.1;
    const guard = this.shieldUp > 0.6 && front ? 0.25 : 1;
    this.hp -= amount * armor * guard * (this.party ? 0.8 : 1);
    this.lastHitBy = { x: fromX, z: fromZ, t: sim.time };
    if (knock > 0) { const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1; this.knockX = dx / L; this.knockZ = dz / L; this.knock = Math.min(knock, 5); }
    if (!this.swing && !this.action) this.play(Math.random() < 0.5 ? 'L_HitBody' : 'Hit_Chest', 1.4, 'upper', 0.05);
    if (!this.hurtSay && this.hp < this.maxHp * 0.35) { this.hurtSay = true; this.say(sim, 'hunt_low_health'); }
    if (this.hp <= 0) this.die(sim);
    return true;
  }

  // A knight's blade (Velscour's men fight heroes too): the knight's own code takes the hp off and calls this.
  onHit(sim, kind, fromX, fromZ) {
    this.lastHitBy = { x: fromX, z: fromZ, t: sim.time };
    if (!this.swing && !this.dead) this.play(Math.random() < 0.5 ? 'L_HitBody' : 'Hit_Chest', 1.4, 'upper', 0.05);
    if (this.hp <= 0 && !this.dead) this.die(sim);
  }

  onBlocked() { this.stam = Math.max(0, this.stam - 12); }
  guardBroken(sim, fromX, fromZ, knock) { this.shieldUp = 0; this.shieldTarget = 0; this.damage(sim, 4, fromX, fromZ, knock); }

  die(sim) {
    if (this.dead) return;
    this.dead = true; this.hp = 0; this.swing = null; this.surf = null; this.air = 0; this.jump = null; this.sitting = false;
    this.play('Death01', 1, 'full', 0.15);
    this.deadT = 0; this.combatTarget = 0; this.shieldTarget = 0;
    this.setState(S.DEAD);
    this.say(sim, 'hero_death', -1, -1, this.foe ? MOB_KEYS.indexOf(mobKind(this.foe)) : -1);
    sim.heroWorld?.onDeath(this);
  }

  // ---- each tick ----

  update(dt, sim, world) {
    this.simRef = sim;
    const p = sim.player;
    this.near = Math.hypot(p.x - this.x, p.z - this.z);
    this.visible = this.active && this.near < VIEW;
    for (const s of this.skills) s.t -= dt;
    this.shotCd -= dt; this.buffT -= dt; this.gestureT -= dt; this.hold -= dt; this.vanishT -= dt;
    if (this.buffT <= 0) this.buff = null;
    if (this.dead) return this.updateDead(dt, sim, world);
    if (this.below) return this.updateBelow(dt, sim, world);
    this.hurt = damp(this.hurt, clamp((1 - this.hp / this.maxHp - 0.45) * 2, 0, 1), 1.5, dt);
    // Out of a fight, wounds close.
    if (!this.foe && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * (this.task?.kind === 'rest' ? 12 : 3));
    if (this.hp > this.maxHp * 0.6) this.hurtSay = false;

    world.think(this, dt);
    this.flyThings(dt, sim);
    if (this.surf) this.updateSurf(dt, sim, world);
    else {
      if (this.foe) this.fight(dt, sim, world);
      this.runSwing(dt, sim);
      this.walk(dt, sim);
      this.move(dt, sim);
      if (this.jump) this.updateJump(dt, sim);
    }
    this.combat = damp(this.combat, this.foe ? 1 : 0, 4, dt);
    this.shieldUp = damp(this.shieldUp, this.shieldTarget, 8, dt);
    // Far off and unseen there's no body to pose: just think, and walk the map.
    this.animT += dt;
    if (this.visible || this.foe) {
      const every = this.near > 70 ? 3 : 1;
      if (this.animTick++ % every === 0) { this.animate(this.animT, sim); this.animT = 0; }
    }
    this.strings(sim);
  }

  updateDead(dt, sim, world) {
    this.deadT += dt;
    this.vx = damp(this.vx, 0, 6, dt); this.vz = damp(this.vz, 0, 6, dt); this.speed = 0;
    if (!this.hidden) {
      this.move(dt, sim);
      if (this.visible) this.animate(dt, sim);
    }
    // Lies where they fell a while, then is gone: back at the well, in a minute or so, a little sheepish.
    if (this.deadT > 22 && !this.hidden) { this.hidden = true; this.ghostT = rand(25, 55); }
    if (this.hidden) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) world.respawn(this);
    }
  }

  updateBelow(dt, sim, world) {
    this.below -= dt;
    if (this.below <= 0) world.emerge(this);
  }

  // Toward the goal the brain set: along the flow field in town, straight across open country, round anything in the way.
  walk(dt, sim) {
    if (this.swing?.root || this.knock > 0) {
      if (this.knock > 0) { this.vx = this.knockX * this.knock; this.vz = this.knockZ * this.knock; this.knock = Math.max(0, this.knock - dt * 9); }
      return;
    }
    const g = this.goal;
    if (this.hold > 0 || this.sitting || !g || this.swing?.still) {
      this.steer(dt, 0, 0, 8, this.holdFace ?? g?.face);
      return;
    }
    const dx = g.x - this.x, dz = g.z - this.z, d = Math.hypot(dx, dz);
    const stop = g.stop ?? 0.6;
    if (d < stop) { this.steer(dt, 0, 0, 8, g.face); this.stuckT = 0; return; }
    let sp = g.speed * (this.cls.walk) * (this.buff?.speed || 1) * (this.hurt > 0.5 ? 0.7 : 1);
    sp = Math.min(sp, Math.max(0.6, d * 1.5));
    // Straight there while the way is open; round the houses on a distance field of the hero's own when it isn't. The field is
    // made once per goal (a goal that moves less than two metres keeps it), so a party in town doesn't redo it every tick.
    if ((this.losT -= dt) <= 0) {
      this.losT = 0.4;
      const look = Math.min(d, 25);
      this.clear = sim.world.clearance(this.x, this.z, dx / d, dz / d, look, 0.45) >= look - 0.05;
    }
    if (!this.clear || this.stuckT > 1.2) {
      const fa = this.fieldAt;
      if (!fa || Math.hypot(fa.x - g.x, fa.z - g.z) > 2) this.fieldAt = { x: g.x, z: g.z, t: sim.time };
      sim.world.updateField(this.fieldAt.x, this.fieldAt.z, this.fieldAt.t, 1 + this.id);
      sim.world.flow(flowDir, this.x, this.z, g.x, g.z, 1 + this.id);
      this.steer(dt, flowDir[0] * sp, flowDir[1] * sp, 7, g.face ?? Math.atan2(flowDir[0], flowDir[1]));
    } else this.steer(dt, dx / d * sp, dz / d * sp, 6, g.face ?? Math.atan2(dx, dz));
    // Stuck on something: a moment on the field, then the field.
    const moved = Math.hypot(this.x - this.lastX, this.z - this.lastZ);
    this.lastX = this.x; this.lastZ = this.z;
    this.stuckT = moved < sp * dt * 0.25 ? this.stuckT + dt : Math.max(0, this.stuckT - dt * 0.5);
  }

  move(dt, sim) {
    super.move(dt, sim);
    if (this.air > 0 || this.airV !== 0) this.y += this.air;
  }

  // ---- fighting -------------------------------------------------------------------------------------------------------

  fight(dt, sim, world) {
    const m = this.foe;
    if (!fightable(m) || (m.heroFoe && m.heroFoe !== this && m.heroFoe.party !== this.party && m.heroFoe.party)) { this.foe = null; return; }
    const dx = m.x - this.x, dz = m.z - this.z, d = Math.hypot(dx, dz), to = Math.atan2(dx, dz);
    const R = radiusOf(m);
    this.faceYaw = turn(this.faceYaw, to, 6 * dt);
    if (this.swing || this.jump) return;
    // A special when one's ready and it suits.
    for (const s of this.skills) {
      if (s.t > 0 || s.song) continue;
      if (s.heal) continue;
      if (s.range && (d - R < s.range[0] || d - R > s.range[1])) continue;
      if (s.crowd && world.crowd(m.x, m.z, 5) < s.crowd) continue;
      if (s.undead && !(m instanceof Zombie)) continue;
      if (this.r() < 0.6) { s.t = s.cd * rand(0.9, 1.3); this.skill(sim, s.key, m); return; }
    }
    if (this.cls.ranged) {
      // Keep the ground between: back off from what comes close, and shoot from where it can't reach.
      const want = this.cls.range * 0.7;
      if (d < 5 && this.r() < 0.02) this.goal = { x: this.x - dx / d * 6, z: this.z - dz / d * 6, speed: 4.2, face: to };
      else if (d > this.cls.range) this.goal = { x: m.x - dx / d * want, z: m.z - dz / d * want, speed: 3.6, face: to };
      else this.goal = null;
      if (d < 2.2) { if (this.shotCd <= 0) this.blow(sim, m); return; }
      if (d <= this.cls.range && this.shotCd <= 0) {
        if (this.style === 'bow') this.shoot(sim, m);
        else this.throwBoomerang(sim, m, 0);
      }
      return;
    }
    const reach = this.blows[0].reach + R - 0.2;
    if (d > reach) this.goal = { x: m.x - dx / d * (reach - 0.4), z: m.z - dz / d * (reach - 0.4), speed: d > 8 ? 4.4 : 3.2, face: to, stop: 0.2 };
    else { this.goal = null; if (this.shotCd <= 0 && Math.abs(wrapAngle(to - this.yaw)) < 0.7) this.blow(sim, m); }
    // The lancer raises the tower board between blows.
    this.shieldTarget = this.style === 'lance' && d < 4 ? 1 : 0;
  }

  // An ordinary blow, landing at its marks in the clip on whatever's in reach in front.
  blow(sim, m) {
    const b = pick(this.blows);
    const speed = 1 + (this.buff?.dmg ? 0.1 : 0);
    const move = BLOW_MOVE[this.person.cls];
    if (move && this.r() < 0.06) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(move));
    this.startSwing(b.clip, b.rate * speed, b.hit, (i) => {
      const lvl = 1 + this.person.level * 0.035;
      this.strikeAround(sim, b.reach, 1.0, b.dmg * lvl * (this.buff?.dmg || 1), b.knock || 0, 1);
    }, { lunge: 2.2 });
    this.shotCd = rand(0.25, 0.7);
  }

  startSwing(clip, rate, hits, fn, o = {}) {
    if (!this.bank.clips[clip]) clip = 'Sword_Regular_A';
    this.play(clip, rate, o.mask || 'full', 0.1);
    this.swing = { clip: this.bank.clips[clip], hits, fn, done: 0, end: o.end ?? 0.92, lunge: o.lunge || 0, still: o.still, root: o.root, after: o.after };
  }

  runSwing(dt, sim) {
    const s = this.swing;
    if (!s) return;
    if (this.action !== s.clip) { this.swing = null; this.charge = null; return; }
    const f = this.actT / s.clip.dur;
    while (s.done < s.hits.length && f >= s.hits[s.done]) { s.fn(s.done, sim); s.done++; }
    if (s.lunge && s.done < s.hits.length && f > s.hits[s.done] - 0.25) {
      const v = s.lunge * (this.foe && Math.hypot(this.foe.x - this.x, this.foe.z - this.z) < 1.4 ? 0 : 1);
      this.vx = Math.sin(this.yaw) * v; this.vz = Math.cos(this.yaw) * v;
    }
    // The lancer's charge: a long run behind the board, through what's in the way.
    if (this.charge && s.root) {
      const v = 11 * Math.sin(Math.min(1, f / 0.15) * Math.PI / 2) * (f > 0.7 ? Math.max(0, (0.95 - f) / 0.25) : 1);
      this.vx = Math.sin(this.charge.dir) * v; this.vz = Math.cos(this.charge.dir) * v;
      if (((sim.tick + this.slot) & 7) === 0) sim.event(EV.STEP, this.x, this.y, this.z, 1, 1, this.id);
    }
    if (f >= s.end) { this.swing = null; this.charge = null; this.stopAction(0.2); s.after?.(sim); }
  }

  // Everything fightable within reach in front of the hero takes the blow.
  strikeAround(sim, reach, arc, dmg, knock, most = 1) {
    let n = 0;
    for (const m of sim.heroWorld.targets) {
      if (!fightable(m)) continue;
      const dx = m.x - this.x, dz = m.z - this.z, d = Math.hypot(dx, dz) - radiusOf(m);
      if (d > reach || Math.abs(m.y - this.y) > 2.5) continue;
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - this.yaw)) > arc) continue;
      this.hit(sim, m, dmg, 'gash', 25, knock);
      if (++n >= most) break;
    }
    if (n) sim.event(EV.WHOOSH, this.x, this.y + 1.2, this.z);
  }

  hit(sim, m, dmg, kind = 'gash', poise = 25, knock = 0) {
    if (!fightable(m)) return;
    // (Someone else already at it: kept, so the kill can be a rescue or a theft.)
    if (m.heroFoe && m.heroFoe !== this && sim.time - (m.heroFoeT ?? -1e9) < 4) { m.otherFoe = m.heroFoe; m.otherFoeT = sim.time; }
    m.heroFoe = this; m.heroFoeT = sim.time;
    if (m instanceof Knight) {
      // Velscour's guards hold: a party can hold one off and slip by, not cut it down for the player to find gone.
      m.hp = Math.max(m.maxHp * 0.4, m.hp - dmg * 0.5);
      m.onHit(sim, kind, this.x, this.z, poise, null);
      return;
    }
    const was = m.hp;
    m.hp -= dmg;
    if (m instanceof Zombie) m.seenHp = m.hp;
    m.onHit?.(sim, kind, this.x, this.z, poise, this);
    if (knock && m instanceof Zombie && !m.crawling) m.reel?.(sim, 0.4);
    sim.event(EV.BITE, m.x, m.y + 1.1, m.z, Math.min(1, dmg / 20));
    if (was > 0 && m.hp <= 0) sim.heroWorld.onKill(this, m);
  }

  // ---- specials ----

  skill(sim, key, m) {
    const w = sim.heroWorld;
    const say = () => { if (this.r() < 0.35) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(key)); };
    switch (key) {
      case 'hammer_throw': {
        // A hammer of light, flung and coming home.
        this.startSwing('OverhandThrow', 1.1, [0.42], () => {
          const h = this.handPos('r');
          w.shots.push({ kind: 'hammer', owner: this, x: h[0], y: h[1], z: h[2], tx: m.x, tz: m.z, ty: m.y + 1, v: 18, out: true, t: 0, hitSet: new Set(), dmg: 18 * this.power() });
        });
        break;
      }
      case 'blessed_hammers':
        this.startSwing('Spell_Simple_Shoot', 1.0, [0.4], () => { w.zones.push({ kind: 'blessed', owner: this, x: this.x, z: this.z, t: 0, life: 4, a0: Math.random() * 6.28, hitT: new Map() }); }, { still: true });
        break;
      case 'consecration':
        this.startSwing('LP_2_handed_fancy_spell_casting', 1.4, [0.5], () => { w.zones.push({ kind: 'consecrate', owner: this, x: this.x, z: this.z, y: sim.world.height(this.x, this.z), t: 0, life: 7, r: 4.2 }); }, { still: true, end: 0.8 });
        break;
      case 'charge': {
        // Head down behind the board, a long run through whatever's in the way.
        const to = Math.atan2(m.x - this.x, m.z - this.z);
        this.yaw = this.faceYaw = to;
        this.shieldTarget = 1;
        this.startSwing('Sword_Dash', 0.8, [0.1, 0.25, 0.4, 0.55], () => {
          for (const k of w.targets) {
            if (!fightable(k) || Math.hypot(k.x - this.x, k.z - this.z) > 2 + radiusOf(k)) continue;
            this.hit(sim, k, 12 * this.power(), 'puncture', 60, 6);
          }
        }, { root: true });
        this.charge = { t: 0, dir: to };
        break;
      }
      case 'shield_wall':
        this.shieldTarget = 1;
        this.startSwing('Idle_Shield_Loop', 1, [0.5], () => { this.buff = { guard: 1 }; this.buffT = 4; }, { still: true, end: 0.6, mask: 'upper' });
        break;
      case 'volley':
        this.aimT = 0;
        this.startSwing('Spell_Simple_Shoot', 0.9, [0.55], () => {
          for (let i = -2; i <= 2; i++) this.loose(sim, m, i * 0.12, 9 * this.power());
        }, { still: true, mask: 'upper' });
        this.draw = 1;
        break;
      case 'vanish': {
        // Smoke, and gone; then behind it, and the knife goes in.
        w.puff(this.x, this.y + 1, this.z, ELEM.VOID);
        this.vanishT = 1.1; this.hidden = true;
        w.later(1.1, () => {
          this.hidden = false;
          const a = (m.yaw ?? Math.atan2(this.x - m.x, this.z - m.z)) + Math.PI;
          this.x = m.x + Math.sin(a) * (radiusOf(m) + 0.9); this.z = m.z + Math.cos(a) * (radiusOf(m) + 0.9);
          this.y = sim.world.height(this.x, this.z);
          this.yaw = this.faceYaw = Math.atan2(m.x - this.x, m.z - this.z);
          w.puff(this.x, this.y + 1, this.z, ELEM.VOID);
          this.startSwing('Sword_Regular_C', 1.0, [0.33], () => this.hit(sim, m, 26 * this.power(), 'puncture', 80));
        });
        break;
      }
      case 'shadow_step': {
        const a = (m.yaw ?? 0) + Math.PI;
        sim.casting.burst(FX.FLARE, ELEM.ARCANE, this.x, this.y + 1, this.z, 0.2, 0.9, 0.3, { light: 6, lightR: 4 });
        this.x = m.x + Math.sin(a) * (radiusOf(m) + 1); this.z = m.z + Math.cos(a) * (radiusOf(m) + 1);
        this.y = sim.world.height(this.x, this.z);
        this.yaw = this.faceYaw = Math.atan2(m.x - this.x, m.z - this.z);
        sim.casting.burst(FX.FLARE, ELEM.ARCANE, this.x, this.y + 1, this.z, 0.2, 0.9, 0.3, { light: 6, lightR: 4 });
        this.startSwing('LP_front_kick_01', 1.15, [0.45], () => this.hit(sim, m, 14 * this.power(), 'gash', 50, 5));
        break;
      }
      case 'throwing_stars':
        this.startSwing('OverhandThrow', 1.25, [0.42], () => {
          const h = this.handPos('r');
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(m.x - h[0], m.z - h[2]) + i * 0.14;
            w.shots.push({ kind: 'star', owner: this, x: h[0], y: h[1], z: h[2], vx: Math.sin(a) * 26, vy: (m.y + 1 - h[1]) / 0.5 * 0.04, vz: Math.cos(a) * 26, t: 0, dmg: 7 * this.power() });
          }
        });
        break;
      case 'jump': {
        // Up past the treetops, and down on it.
        this.jump = { t: 0, x0: this.x, z0: this.z, x1: m.x, z1: m.z, phase: 0, foe: m };
        this.play('NinjaJump_Start', 1.2, 'full', 0.08);
        break;
      }
      case 'double_throw':
        this.throwBoomerang(sim, m, 0);
        w.later(0.35, () => { if (fightable(m)) this.throwBoomerang(sim, m, 1); });
        break;
      default: break;
    }
    say();
  }

  power() { return (1 + this.person.level * 0.035) * (this.buff?.dmg || 1); }

  // An arrow: drawn, the string lit in the archer's colour, and loosed.
  shoot(sim, m) {
    this.draw = 0;
    this.startSwing('Spell_Simple_Shoot', 0.8, [0.55], () => this.loose(sim, m, 0, 10 * this.power()), { still: true, mask: 'upper' });
    this.shotCd = rand(0.7, 1.4);
  }

  loose(sim, m, spread, dmg) {
    const h = this.handPos('l');
    const ty = m.y + (m instanceof Gravehart ? 1.8 : 1.1);
    const a = Math.atan2(m.x - h[0], m.z - h[2]) + spread, d = Math.hypot(m.x - h[0], m.z - h[2]);
    const v = 42, t = d / v;
    sim.heroWorld.shots.push({ kind: 'arrow', owner: this, x: h[0], y: h[1], z: h[2], vx: Math.sin(a) * v, vy: (ty - h[1]) / t + 2.5 * t, vz: Math.cos(a) * v, t: 0, dmg, elem: this.stringElem });
    sim.event(EV.WHOOSH, h[0], h[1], h[2]);
    this.draw = 0;
  }

  throwBoomerang(sim, m, hand) {
    if (this.flight && this.flight.length >= 2) return;
    this.startSwing('OverhandThrow', 1.15, [0.42], () => {
      const h = this.handPos(hand ? 'l' : 'r');
      const out = Math.min(14, Math.hypot(m.x - this.x, m.z - this.z) + 2);
      const dir = Math.atan2(m.x - this.x, m.z - this.z);
      (this.flight ||= []).push({ hand, t: 0, dur: 1.5, x0: h[0], y0: h[1], z0: h[2], dir, out, side: hand ? -1 : 1, hitSet: new Set(), dmg: 9 * this.power(), x: h[0], y: h[1], z: h[2] });
    });
    this.shotCd = rand(0.9, 1.5);
  }

  flyThings(dt, sim) {
    if (!this.flight) return;
    for (const f of this.flight) {
      f.t += dt;
      // Out along a curve and back to the hand that threw it.
      const u = Math.min(1, f.t / f.dur), a = u * Math.PI * 2;
      const fwd = Math.sin(a * 0.5) * f.out, side = (1 - Math.cos(a)) * 0.5 * f.out * 0.35 * f.side;
      const h = this.handPos(f.hand ? 'l' : 'r');
      const bx = f.x0 + (h[0] - f.x0) * u, bz = f.z0 + (h[2] - f.z0) * u;
      f.x = bx + Math.sin(f.dir) * fwd + Math.cos(f.dir) * side;
      f.z = bz + Math.cos(f.dir) * fwd - Math.sin(f.dir) * side;
      f.y = f.y0 + (h[1] - f.y0) * u + Math.sin(u * Math.PI) * 0.4;
      f.spin = (f.spin || 0) + dt * 22;
      for (const m of sim.heroWorld.targets) {
        if (!fightable(m) || f.hitSet.has(m) || Math.hypot(m.x - f.x, m.z - f.z) > radiusOf(m) + 0.6 || Math.abs(m.y + 1 - f.y) > 1.6) continue;
        f.hitSet.add(m); this.hit(sim, m, f.dmg, 'gash', 20);
      }
    }
    this.flight = this.flight.filter((f) => f.t < f.dur);
    if (!this.flight.length) this.flight = null;
  }

  updateJump(dt, sim) {
    const j = this.jump;
    j.t += dt;
    const T = 1.5;
    if (j.phase === 0 && j.t > 0.25) { j.phase = 1; j.t = 0; this.play('NinjaJump_Idle_Loop', 1, 'full', 0.1); sim.event(EV.JUMP, this.x, this.y, this.z); }
    if (j.phase === 1) {
      const u = Math.min(1, j.t / T);
      if (j.foe && fightable(j.foe)) { j.x1 = j.foe.x; j.z1 = j.foe.z; }
      const ex = j.x1 - Math.sin(Math.atan2(j.x1 - j.x0, j.z1 - j.z0)) * 1.2, ez = j.z1 - Math.cos(Math.atan2(j.x1 - j.x0, j.z1 - j.z0)) * 1.2;
      this.x = j.x0 + (ex - j.x0) * u; this.z = j.z0 + (ez - j.z0) * u;
      this.air = Math.sin(u * Math.PI) * 9;
      this.y = sim.world.height(this.x, this.z) + this.air;
      this.vx = 0; this.vz = 0;
      if (u >= 1) {
        j.phase = 2; this.air = 0; this.y = sim.world.height(this.x, this.z);
        this.play('NinjaJump_Land', 1, 'full', 0.05);
        sim.casting.burst(FX.SHOCK, ELEM.STONE, this.x, this.y + 0.2, this.z, 0.5, 3.5, 0.45, { light: 10, lightR: 6 });
        sim.casting.burst(FX.RING, ELEM.STONE, this.x, this.y + 0.05, this.z, 0.5, 4, 0.6);
        sim.event(EV.LAND, this.x, this.y, this.z, 1);
        for (const m of sim.heroWorld.targets) if (fightable(m) && Math.hypot(m.x - this.x, m.z - this.z) < 3.5 + radiusOf(m)) this.hit(sim, m, 22 * this.power(), 'puncture', 70, 5);
      }
    } else if (j.phase === 2 && j.t > 0.6) { this.jump = null; this.stopAction(0.2); }
  }

  // Where a hand is now (the fist's middle).
  handPos(side) {
    const j = side === 'l' ? this.J.handL : this.J.handR, wt = this.pose.wt;
    return [wt[j * 3], wt[j * 3 + 1], wt[j * 3 + 2]];
  }

  // The bowstring, while drawn: the archer's own colour, tip to fist to tip.
  strings(sim) {
    const s = this.swing;
    const drawing = this.style === 'bow' && s && s.clip.name === 'Spell_Simple_Shoot' && s.done === 0;
    this.draw = damp(this.draw, drawing ? 1 : 0, drawing ? 5 : 14, 1 / 120);
    if (this.draw < 0.05 || !this.visible || !this.bowTips) return;
    const [top, bot] = this.bowTips, nock = this.handPos('r');
    const mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2];
    const at = [mid[0] + (nock[0] - mid[0]) * this.draw, mid[1] + (nock[1] - mid[1]) * this.draw, mid[2] + (nock[2] - mid[2]) * this.draw];
    sim.heroWorld.cord(top, at, this.stringElem, this.draw);
    sim.heroWorld.cord(at, bot, this.stringElem, this.draw);
  }

  // ---- the shield ride: down the Fall like the player rides it, sideways on the board ----

  updateSurf(dt, sim, world) {
    const s = this.surf, line = THE_FALL.line, n = line.length;
    // Gravity along the road's own pitch, less the drag of the snow-dust and the air.
    const i = Math.max(1, Math.min(n - 1, s.i));
    const a = line[i - 1], b = line[i];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const drop = (THE_FALL.y[i] - THE_FALL.y[i - 1]) / seg;     // how far it falls per metre ridden (the line runs foot to top)
    s.v = clamp(s.v + (9.8 * drop * 0.9 - 0.02 * s.v * s.v - 0.4) * dt, 3, 21);
    s.d -= s.v * dt;                 // distance from the foot, going down
    while (s.i > 1 && THE_FALL.s[s.i - 1] > s.d) s.i--;
    const k = s.i, p0 = line[k - 1], p1 = line[k];
    const L = (THE_FALL.s[k] - THE_FALL.s[k - 1]) || 1, u = clamp((s.d - THE_FALL.s[k - 1]) / L, 0, 1);
    const dirx = (p0[0] - p1[0]) / L, dirz = (p0[1] - p1[1]) / L;
    s.wob += dt * (0.7 + s.v * 0.05);
    const lane = s.lane + Math.sin(s.wob) * 1.6;
    const x = p0[0] + (p1[0] - p0[0]) * u - dirz * lane, z = p0[1] + (p1[1] - p0[1]) * u + dirx * lane;
    this.vx = (x - this.x) / dt; this.vz = (z - this.z) / dt;
    this.x = x; this.z = z;
    // (Riding high enough that the board shows over the drawn ground, which can sit a hand above the sampled height.)
    this.y = sim.world.height(x, z) + 0.26;
    this.speed = 0;
    const travel = Math.atan2(dirx, dirz);
    s.travel = travel;
    // Side-on, leading foot downhill, leaning into the line.
    this.yaw = this.faceYaw = wrapAngle(travel + Math.PI / 2 * s.foot);
    if (this.action?.name !== 'Crouch_Idle_Loop' && !s.crash) this.play('Crouch_Idle_Loop', 1, 'full', 0.25);
    // Through anything on the road.
    for (const m of world.targets) {
      if (!fightable(m) || s.hitSet.has(m) || Math.hypot(m.x - x, m.z - z) > radiusOf(m) + 1.1) continue;
      s.hitSet.add(m); this.hit(sim, m, 10 + s.v, 'gash', 60, 6);
      if (this.r() < 0.4) this.say(sim, 'surf_hit', -1, -1, MOB_KEYS.indexOf(mobKind(m)));
    }
    // Now and then the steep pitches throw someone.
    if (!s.crash && s.v > 17 && this.r() < dt * 0.02) {
      s.crash = 1.4; this.play('LP_fall', 1, 'full', 0.08); this.say(sim, 'surf_crash');
      s.v *= 0.4;
    }
    if (s.crash) { s.crash -= dt; s.v *= 1 - dt * 2; if (s.crash <= 0) { s.crash = 0; } }
    if (s.d <= 20 || Math.hypot(x, z) < TOWN_R - 10) world.surfDone(this);
    this.animT += dt;
    if (this.visible) { this.animate(this.animT, sim); this.animT = 0; }
  }

  // ---- what's in the hands -------------------------------------------------------------------------------------------

  writeProps(out, off) {
    super.writeProps(out, off);     // main: the right fist's hold. off: the shield on the forearm.
    const { pose, J } = this;
    const wq = pose.wq, wt = pose.wt;
    const zero = (o) => { for (let i = 0; i < 16; i++) out[o + i] = 0; };
    const fromHand = (o, j, q, t) => {
      quatMul(propQ, 0, wq, j * 4, q, 0);
      quatRotate(propT, 0, wq, j * 4, t, 0);
      propT[0] += wt[j * 3]; propT[1] += wt[j * 3 + 1]; propT[2] += wt[j * 3 + 2];
      mat4FromQT(propM, propQ, 0, propT, 0);
      out.set(propM, o);
    };
    if (this.dead && this.deadT > 1.5) { zero(off); zero(off + 16); }
    // The bow rides in the left fist, limbs up, string toward the archer: the right hand is for the arrow.
    if (this.style === 'bow') {
      const h = J.handL * 3, e = J.foreL * 3;
      const d = norm([wt[h] - wt[e], wt[h + 1] - wt[e + 1], wt[h + 2] - wt[e + 2]]);
      const kq = [0, 0, 0];
      quatRotate(kq, 0, wq, J.handL * 4, this.bank.grip.l.knuckles, 0);
      const y = norm(orth(kq, d)), z = norm(orth([-d[0], -d[1], -d[2]], y)), x = cross(y, z);
      const q = matToQuat(x, y, z);
      const fist = [0, 0, 0]; quatRotate(fist, 0, wq, J.handL * 4, this.fistOff, 0);
      propT[0] = wt[h] + fist[0]; propT[1] = wt[h + 1] + fist[1]; propT[2] = wt[h + 2] + fist[2];
      propQ.set(q);
      mat4FromQT(propM, propQ, 0, propT, 0);
      out.set(propM, off);
      // The tips, in the world, for the string.
      const tips = this.mainP?.tips;
      if (tips) {
        this.bowTips = tips.map((t) => [propM[0] * t[0] + propM[4] * t[1] + propM[8] * t[2] + propM[12], propM[1] * t[0] + propM[5] * t[1] + propM[9] * t[2] + propM[13], propM[2] * t[0] + propM[6] * t[1] + propM[10] * t[2] + propM[14]]);
      }
      zero(off + 16);
    } else if (this.style === 'daggers' || this.style === 'boomerang') {
      fromHand(off + 16, J.handL, this.offQ, this.offT);
    } else if (!this.shieldStyle) zero(off + 16);
    // In flight, a boomerang leaves its hand and spins along its curve.
    if (this.flight) {
      for (const f of this.flight) {
        const o = off + (f.hand ? 16 : 0);
        const c = Math.cos(f.spin), s = Math.sin(f.spin);
        // Flat, spinning about the up axis: its long axis turns in the ground's plane.
        out.set([c, 0, -s, 0, s, 0, c, 0, 0, -1, 0, 0, f.x, f.y, f.z, 1], o);
      }
    }
    // The board: on the back, or under the feet on the Fall.
    const bo = off + 32;
    if (this.surf) {
      const t = this.surf.travel ?? this.yaw;
      // Long axis down the road, its painted face up under the boots (the boards are one-sided: face down, they vanish).
      const fx = Math.sin(t), fz = Math.cos(t);
      const y = [fx, 0, fz], z = [0, -1, 0], x = cross(y, z);
      propQ.set(matToQuat(x, y, z));
      propT[0] = this.x; propT[1] = this.y - 0.1; propT[2] = this.z;
      mat4FromQT(propM, propQ, 0, propT, 0);
      // A shield-bearer rides their own board.
      out.set(propM, this.shieldStyle ? off + 16 : bo);
      if (this.shieldStyle) zero(bo);
    } else if (this.backP && !(this.dead && this.deadT > 1.5)) fromHand(bo, J.spine3, this.backQ, this.backT);
    else zero(bo);
  }

  animate(dt, sim) {
    // A gesture asked for by the words, or a song, plays as a whole-body clip; ended when it's done (loops are timed).
    if (this.action && !this.swing && !this.dead && !this.surf && !this.jump) {
      const c = this.action;
      if (this.gesture && this.gestureT <= 0) { this.gesture = null; this.stopAction(0.3); }
      else if (!this.gesture && !c.loop && this.actT >= c.dur * 0.95) this.stopAction(0.25);
      else if (!this.gesture && !this.sitting && c.loop && c.name !== 'Crouch_Idle_Loop') this.stopAction(0.25);
    }
    super.animate(dt, sim);
  }

  gesture_(name, seconds) {
    if (this.dead || this.swing || this.surf || this.foe || !this.active) return;
    const list = GESTURES[name];
    if (!list) return;
    const clip = list[Math.floor(Math.random() * list.length)];
    if (!this.bank.clips[clip]) return;
    this.play(clip, 1, 'full', 0.25);
    this.gesture = name;
    this.gestureT = seconds ?? Math.min(6, this.bank.clips[clip].dur * (this.bank.clips[clip].loop ? 2 : 1));
  }

  write(snap, cOff, sim) {
    if (!this.visible && !(this.dead && !this.hidden && this.near < VIEW)) {
      snap[cOff + C.ACTIVE] = 0;
      snap.fill(0, cOff + C_PROPS, cOff + C_PROPS + 48);
      this.writeHero(snap, cOff, 0);
      return;
    }
    super.write(snap, cOff, sim);
    this.writeHero(snap, cOff, 1);
  }

  // What the render thread needs for the name over the head and the chat: see C_HERO in src/core/layout.js.
  writeHero(snap, cOff, shown) {
    const o = cOff + C_HERO, h = this.J.head * 3;
    snap[o] = shown ? 1 : 0;
    snap[o + 1] = shown ? this.pose.wt[h + 1] + 0.32 * this.rig.height / 1.8 : 0;
    snap[o + 2] = this.x; snap[o + 3] = this.y; snap[o + 4] = this.z;
    snap[o + 5] = this.hp / this.maxHp;
    snap[o + 6] = this.person.level;
    snap[o + 7] = this.party ? this.party.id : -1;
    snap[o + 8] = ACT_CODES[this.task?.kind] ?? 0;
    snap[o + 9] = this.dead ? 1 : 0;
    snap[o + 10] = this.below > 0 ? 1 : 0;
    snap[o + 11] = this.foe ? 1 : 0;
  }
}

export const ACT_NAMES = ['town', 'hunt', 'delve', 'summit', 'surf', 'errands', 'social', 'perform', 'rest', 'return', 'duel', 'help'];
const ACT_CODES = Object.fromEntries(ACT_NAMES.map((n, i) => [n, i]));
const propQ = new Float32Array(4), propT = new Float32Array(3), propM = new Float32Array(16), flowDir = new Float32Array(2);

// ---- the world of heroes: their days, their parties, their meetings ----------------------------------------------------

export class HeroWorld {
  constructor(sim, heroes) {
    this.sim = sim; this.heroes = heroes;
    this.shots = []; this.zones = []; this.timers = []; this.cords = [];
    this.parties = []; this.partyId = 1;
    this.hour = 12;
    this.killed = [];              // monsters heroes have killed, for standing them again
    this.targets = [];
    this.firsts = new Set();       // big monsters someone has already had the first kill of
    this.duels = [];
    // Everyone starts about the town, at their own business.
    const town = PLACES.filter((p) => p.kind === 'town');
    for (const h of heroes) {
      const g = this.spotIn(pick(town), h);
      h.x = h.lastX = g.x; h.z = h.lastZ = g.z; h.y = sim.world.height(h.x, h.z);
      h.yaw = h.faceYaw = Math.random() * 6.28;
      h.meetT = rand(4, 30);
    }
  }

  later(t, fn) { this.timers.push({ t, fn }); }
  puff(x, y, z, elem) { this.sim.casting.burst(FX.PUFF, elem, x, y, z, 0.4, 1.3, 0.9, { alpha: 0.8 }); }
  cord(a, b, elem, k) { this.cords.push([a, b, elem, k]); }

  // How many fightable things stand near a point.
  crowd(x, z, r) { let n = 0; for (const m of this.targets) if (fightable(m) && Math.hypot(m.x - x, m.z - z) < r) n++; return n; }

  step(dt) {
    const { sim } = this;
    this.targets = sim.knights.filter((k) => !k.dead && !k.dormant);
    for (const t of this.timers) t.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    this.timers = this.timers.filter((t) => t.t > 0);
    for (const t of due) t.fn();
    this.cords.length = 0;
    for (const h of this.heroes) h.update(dt, sim, this);
    this.stepShots(dt);
    this.stepZones(dt);
    this.stepParties(dt);
    this.stepRespawns(dt);
    this.stepMeetings(dt);
    // Dawn and dusk, said once each by someone in town.
    const band = hourBand(this.hour);
    if (this.lastBand !== undefined && band !== this.lastBand) {
      const inTown = this.heroes.filter((h) => h.active && !h.dead && Math.hypot(h.x, h.z) < TOWN_R);
      const h = inTown[Math.floor(Math.random() * inTown.length)];
      if (h) h.say(sim, band === 1 ? 'dawn' : band === 3 ? 'dusk_town' : band === 0 ? 'goodnight' : 'town_idle');
      if (band === 3) for (const x of this.heroes) if (x.task && x.task.kind === 'hunt' && Math.hypot(x.x, x.z) > TOWN_R + 30 && Math.random() < 0.5) { x.say(sim, 'night_falls_out'); this.goHome(x); }
    }
    this.lastBand = band;
  }

  // Drawn after the spells' own shapes each tick (Sim.step), so they share the frame's budget without being wiped.
  drawFx() {
    const c = this.sim.casting;
    for (const [a, b, elem, k] of this.cords) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
      c.fx(FX.BEAM, elem, a[0], a[1], a[2], 0.006, dx / L, dy / L, dz / L, L, 0.9 * k, 0.6 * k, 1.2, 0, 0, 0.006);
    }
    for (const s of this.shots) {
      if (s.kind === 'arrow') {
        const v = Math.hypot(s.vx, s.vy, s.vz) || 1;
        c.fx(FX.TRAIL, s.elem, s.x, s.y, s.z, 0.035, -s.vx / v, -s.vy / v, -s.vz / v, 0.9, 1, 1.5, 2, 0, s.seed ?? 0);
      } else if (s.kind === 'star') {
        c.fx(FX.BLADE, ELEM.SPIRIT, s.x, s.y, s.z, 0.1, Math.sin(s.t * 30), 0.2, Math.cos(s.t * 30), 0.16, 1, 0.6, 1.5);
      } else if (s.kind === 'hammer') {
        c.fx(FX.ORB, ELEM.LIGHT, s.x, s.y, s.z, 0.22, 0, 1, 0, 0, 1, 6, 5);
        c.fx(FX.ROCK, ELEM.LIGHT, s.x, s.y, s.z, 0.18, Math.sin(s.t * 18), 0, Math.cos(s.t * 18), 0.3, 1, 0, 0, 0, 0.4);
      }
    }
    for (const z of this.zones) {
      if (z.kind === 'consecrate') {
        const k = Math.min(1, z.t * 3, (z.life - z.t) * 1.5);
        c.fx(FX.DISC, ELEM.LIGHT, z.x, z.y + 0.04, z.z, z.r, 0, 1, 0, 0, 0.75 * k, 10 * k, z.r * 2);
        c.fx(FX.RING, ELEM.LIGHT, z.x, z.y + 0.06, z.z, z.r * (0.94 + 0.04 * Math.sin(z.t * 6)), 0, 1, 0, 0, 0.9 * k);
        c.fx(FX.RUNE, ELEM.LIGHT, z.x, z.y + 0.08, z.z, z.r * 0.6, 0, 1, 0, 0, 0.6 * k, 0, 0, z.t * 0.1, 0.3);
      } else if (z.kind === 'blessed') {
        for (const [hx, hy, hz] of this.hammers(z)) c.fx(FX.ORB, ELEM.LIGHT, hx, hy, hz, 0.2, 0, 1, 0, 0, 1, 4, 4);
      } else if (z.kind === 'song') {
        const o = z.owner;
        for (let i = 0; i < 3; i++) {
          const a = z.t * 1.3 + i * 2.09, r = 0.7 + ((z.t * 0.6 + i * 0.33) % 1) * 1.6;
          c.fx(FX.RUNE, z.elem, o.x + Math.sin(a) * r, o.y + 1.6 + ((z.t * 0.5 + i * 0.3) % 1) * 1.4, o.z + Math.cos(a) * r, 0.16, 0, 1, 0, 0, 0.8, 1.5, 2, 0, i * 0.3);
        }
      }
    }
  }

  hammers(z) {
    const o = z.owner, out = [];
    for (let i = 0; i < 3; i++) {
      const a = z.a0 + i * 2.094 + z.t * 3.4, r = 0.8 + z.t * 1.4;
      out.push([z.x + Math.sin(a) * r, o.y + 1.1, z.z + Math.cos(a) * r]);
    }
    return out;
  }

  stepShots(dt) {
    const sim = this.sim;
    for (const s of this.shots) {
      s.t += dt;
      if (s.kind === 'hammer') {
        // Out to where the foe stood, through what's there, and back to the paladin's hand.
        const o = s.owner, home = s.out ? [s.tx, s.ty, s.tz] : o.handPos('r');
        const dx = home[0] - s.x, dy = home[1] - s.y, dz = home[2] - s.z, L = Math.hypot(dx, dy, dz);
        if (L < 0.6) { if (s.out) s.out = false; else s.done = true; }
        const step = Math.min(L, s.v * dt);
        s.x += dx / (L || 1) * step; s.y += dy / (L || 1) * step; s.z += dz / (L || 1) * step;
        for (const m of this.targets) {
          if (!fightable(m) || s.hitSet.has(m) || Math.hypot(m.x - s.x, m.z - s.z) > radiusOf(m) + 0.7) continue;
          s.hitSet.add(m); o.hit(sim, m, s.dmg, 'gash', 50, 3);
          sim.casting.burst(FX.FLARE, ELEM.LIGHT, s.x, s.y, s.z, 0.3, 1.2, 0.25, { light: 12, lightR: 6 });
        }
        if (s.t > 4) s.done = true;
        continue;
      }
      s.vy -= (s.kind === 'arrow' ? 5 : 2) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y < sim.world.height(s.x, s.z) || s.t > 1.6) { s.done = true; continue; }
      for (const m of this.targets) {
        if (!fightable(m)) continue;
        const r = radiusOf(m) + 0.35;
        if (Math.hypot(m.x - s.x, m.z - s.z) > r || s.y < m.y || s.y > m.y + (m instanceof Gravehart ? 3.5 : 2.2) * (m.scale || 1)) continue;
        s.owner.hit(sim, m, s.dmg, 'puncture', 30);
        s.done = true;
        break;
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  stepZones(dt) {
    const sim = this.sim;
    for (const z of this.zones) {
      z.t += dt;
      if (z.kind === 'consecrate') {
        // Holy ground burns the dead that stand on it, and nothing else.
        for (const m of this.targets) {
          if (!fightable(m) || !(m instanceof Zombie) || Math.hypot(m.x - z.x, m.z - z.z) > z.r + radiusOf(m)) continue;
          if (((z.t * 4) | 0) !== (((z.t - dt) * 4) | 0)) z.owner.hit(sim, m, 3.2 * z.owner.power(), 'burn', 5);
        }
      } else if (z.kind === 'blessed') {
        for (const [hx, , hz] of this.hammers(z)) {
          for (const m of this.targets) {
            if (!fightable(m) || Math.hypot(m.x - hx, m.z - hz) > radiusOf(m) + 0.6) continue;
            if (sim.time - (z.hitT.get(m) ?? -9) < 0.45) continue;
            z.hitT.set(m, sim.time); z.owner.hit(sim, m, 6 * z.owner.power(), 'gash', 20);
          }
        }
      } else if (z.kind === 'song') {
        z.x = z.owner.x; z.z = z.owner.z;
        if (z.heal) for (const h of z.members) if (!h.dead) h.hp = Math.min(h.maxHp, h.hp + dt * 6);
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.life && !z.owner.dead);
  }

  // ---- killing, dying, coming back -----------------------------------------------------------------------------------

  onKill(h, m) {
    m.heroKill = true;
    if (h.foe === m) h.foe = null;
    // Another hero was fighting it: low on life, that's a rescue (a debt, and likely a friend); hale, a kill taken from them.
    const sim = this.sim;
    const y = m.otherFoe && m.otherFoe !== h && !m.otherFoe.dead && sim.time - (m.otherFoeT ?? -1e9) < 4 ? m.otherFoe
      : this.heroes.find((x) => x !== h && x.foe === m && !x.dead);
    m.otherFoe = null;
    if (y && !(h.party && h.party === y.party && y.hp > y.maxHp * 0.35)) {
      const mi = MOB_KEYS.indexOf(mobKind(m));
      if (y.hp < y.maxHp * 0.35) y.say(sim, 'bond_change', h.slot, -1, mi, CAUSES.indexOf('rescued'));
      else if (!h.party || h.party !== y.party) y.say(sim, 'bond_change', h.slot, -1, mi, CAUSES.indexOf('kill_lost'));
    }
    this.killed.push({ m, at: this.sim.time, after: rand(...RESPAWN) });
    this.reward(h, mobKind(m));
  }

  // A kill's worth: the tally, the bag, the experience and the words. (A kill out of the player's sight comes here alone.)
  reward(h, kind) {
    const sim = this.sim, mob = MOBS[kind];
    h.kills++; h.bag += kind === 'zombie' ? (Math.random() < 0.4 ? 1 : 0) : 1 + (mob?.danger || 1);
    h.xp += 8 * (mob?.danger || 1);
    const mi = MOB_KEYS.indexOf(kind);
    if (mob && mob.danger >= 3 && !this.firsts.has(kind)) { this.firsts.add(kind); h.say(sim, 'boss_first_kill', -1, -1, mi); }
    else if (Math.random() < (mob?.danger >= 2 ? 0.7 : 0.18)) h.say(sim, 'hunt_kill', -1, -1, mi);
    // Loot now and then, a rare thing once in a long while.
    if (Math.random() < 0.06 * (mob?.danger || 1)) { h.say(sim, 'rare_drop', -1, -1, mi); h.bag += 2; }
    else if (Math.random() < 0.12) h.say(sim, 'hunt_loot', -1, -1, mi);
    // The player's watching a kill they'd have had: the words side notices (player_steals_kill is theirs).
    const need = h.person.level * 40;
    if (h.xp >= need) {
      h.xp -= need; h.person.level++;
      h.say(sim, 'level_up', -1, -1, -1, h.person.level);
      sim.event(EV.HERO_LEVEL, h.slot, h.person.level);
      const near = this.heroes.filter((o) => o !== h && o.active && !o.dead && Math.hypot(o.x - h.x, o.z - h.z) < 30);
      for (const o of near.slice(0, 2)) this.later(rand(1.2, 3), () => o.say(sim, 'level_up_congrats', h.slot, -1, -1, h.person.level));
    }
  }

  onDeath(h) {
    const sim = this.sim;
    if (h.party) {
      const alive = [...h.party.members].filter((o) => !o.dead);
      for (const o of alive.slice(0, 2)) this.later(rand(0.6, 2), () => o.say(sim, 'ally_down', h.slot));
      if (!alive.length) { const any = [...h.party.members][0]; this.later(2, () => any.say(sim, 'wipe')); this.disband(h.party, true); }
    }
    h.foe = null;
  }

  respawn(h) {
    const sim = this.sim, well = placeOf('well');
    const a = Math.random() * 6.28;
    h.reset({ ...h.opts, spawn: [well.spot[0] + Math.sin(a) * 3, well.spot[1] + Math.cos(a) * 3] });
    h.y = sim.world.height(h.x, h.z);
    const keep = { level: h.person.level };
    h.heroReset();
    Object.assign(h.person, keep);
    h.stopAction(0.01);
    h.say(sim, 'hero_return');
    if (Math.random() < 0.5) this.later(4, () => h.say(sim, 'corpse_run'));
  }

  stepRespawns() {
    const sim = this.sim, p = sim.player;
    this.killed = this.killed.filter((k) => {
      const m = k.m;
      // (A killing blow leaves hp at 0 a tick or two before the body's own update calls it dead: still the hero's.)
      if (!m.dead && m.hp > 0) { m.heroKill = false; return false; }
      if (!m.dead) return sim.time - k.at < 60;
      if (sim.time - k.at < k.after) return true;
      const sp = m.opts?.spawn;
      if (!sp || Math.hypot(p.x - sp[0], p.z - sp[1]) < 70) return true;
      m.reset(m.opts);
      if (m instanceof Zombie || m instanceof Crab || m instanceof Gravehart || m instanceof FieldCreature) m.y = sim.world.height(m.x, m.z);
      m.heroKill = false; m.heroFoe = null;
      return false;
    });
  }

  // ---- the day ---------------------------------------------------------------------------------------------------------

  think(h, dt) {
    const sim = this.sim, p = sim.player;
    if (h.vanishT > 0) return;
    // A fight comes first: something at them, something at their party, or the player in trouble close by.
    if (!h.foe && !h.surf && !h.task?.peace) {
      let best = null, bd = h.cls.ranged ? 20 : 14;
      for (const m of this.targets) {
        if (!fightable(m)) continue;
        const d = Math.hypot(m.x - h.x, m.z - h.z);
        const onUs = m.heroFoe && (m.heroFoe === h || (h.party && m.heroFoe.party === h.party)) && sim.time - m.heroFoeT < 6;
        const onPlayer = !p.dead && m.aggro && Math.hypot(m.x - p.x, m.z - p.z) < 10 && Math.hypot(p.x - h.x, p.z - h.z) < 26;
        const hunted = h.task?.kind === 'hunt' && h.task.there && h.task.place.mobs?.includes(mobKind(m)) && d < 34;
        const knight = m instanceof Knight;
        if (knight && !(onUs || (h.task?.kind === 'delve' && h.task.door))) continue;
        if (!(onUs || onPlayer || hunted || (d < 7 && m.aggro))) continue;
        // Nobody walks alone into what takes four.
        const mob = MOBS[mobKind(m)];
        if (hunted && !onUs && mob && mob.danger > (h.party ? h.party.members.size + 1 : 1) + h.person.level / 12) continue;
        const score = d - (onUs ? 8 : 0) - (onPlayer ? 4 : 0);
        if (score < bd) { bd = score; best = m; }
        if (onPlayer && sim.time - h.helpT > 40) { h.helpT = sim.time; h.say(sim, 'player_help'); }
      }
      if (best) {
        h.foe = best; h.sitting = false; h.hold = 0;
        if (best.heroFoe !== h) { best.heroFoe = h; best.heroFoeT = sim.time; }
        if (Math.random() < 0.3) h.say(sim, best.champion ? 'hunt_champion' : 'hunt_pull', -1, -1, MOB_KEYS.indexOf(mobKind(best)));
        if (h.gesture) { h.gesture = null; h.stopAction(0.1); }
      }
    }
    // Paladins and bards look after people, in a fight or out of it.
    this.care(h);
    if (h.foe) {
      // Too hurt and on their own: back to the town's ground, where nothing follows.
      if (h.hp < h.maxHp * 0.25 && !h.party && Math.hypot(h.x, h.z) > TOWN_R) { h.foe = null; this.goHome(h, true); }
      return;
    }
    if (h.hold > 0 || h.swing) return;
    if (h.walkWith && this.walking(h)) return;
    const t = h.task;
    if (!t) return this.choose(h);
    switch (t.kind) {
      case 'town': case 'errands': case 'social': case 'rest': case 'perform': return this.inTown(h, t, dt);
      case 'hunt': return this.hunt(h, t, dt);
      case 'delve': return this.delve(h, t, dt);
      case 'summit': return this.climb(h, t, dt);
      case 'return': return this.returning(h, t, dt);
      case 'duel': return this.duel(h, t, dt);
      default: h.task = null;
    }
  }

  care(h) {
    const sim = this.sim, p = sim.player;
    for (const s of h.skills) {
      if (s.t > 0 || h.swing || h.surf || h.jump) continue;
      if (s.key === 'holy_light') {
        // The lowest of anyone near: a party member, any hero, or the player.
        let who = null, low = 0.55;
        for (const o of this.heroes) if (!o.dead && o.active && Math.hypot(o.x - h.x, o.z - h.z) < 14 && o.hp / o.maxHp < low) { low = o.hp / o.maxHp; who = o; }
        if (!p.dead && Math.hypot(p.x - h.x, p.z - h.z) < 14 && p.hp / p.maxHp < low) who = p;
        if (!who) continue;
        s.t = s.cd;
        h.startSwing('Spell_Simple_Shoot', 1.1, [0.45], () => {
          if (who.dead) return;
          const amt = who === p ? p.maxHp * 0.3 : who.maxHp * 0.35;
          who.hp = Math.min(who.maxHp, who.hp + amt);
          sim.casting.burst(FX.COLUMN, ELEM.LIGHT, who.x, who.y, who.z, 0.6, 1.1, 0.9, { light: 14, lightR: 6, len: 3 });
          sim.casting.burst(FX.RING, ELEM.LIGHT, who.x, who.y + 0.05, who.z, 0.3, 1.3, 0.7);
          if (who === p) h.say(sim, 'player_heal');
          else if (who !== h) h.say(sim, 'hunt_heal', who.slot);
        }, { still: true, mask: 'upper' });
        return;
      }
      if (s.song && (h.foe || (s.travel && h.task && h.task.going)) && (!s.heal || h.foe)) {
        const members = h.party ? [...h.party.members] : [h];
        if (s.heal && !members.some((o) => o.hp < o.maxHp * 0.7)) continue;
        s.t = s.cd;
        h.startSwing(pick(GESTURES.sing), 1, [0.1], () => {
          const elem = s.key === 'war_song' ? ELEM.FIRE : s.key === 'marching_song' ? ELEM.STORM : ELEM.HEAL;
          this.zones.push({ kind: 'song', owner: h, members, x: h.x, z: h.z, t: 0, life: 6, elem, heal: s.heal });
          for (const o of members) { o.buff = s.key === 'war_song' ? { dmg: 1.25 } : s.key === 'marching_song' ? { speed: 1.25 } : o.buff; o.buffT = 20; }
          if (Math.random() < 0.5) h.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(s.key));
        }, { still: !s.travel, mask: s.travel ? 'upper' : 'full', end: 0.7 });
        return;
      }
    }
  }

  // What next: weighed by the hour and the hero's own leanings; hunts and climbs mostly as parties.
  choose(h) {
    const sim = this.sim, band = hourBand(this.hour), L = h.lean;
    const w = {};
    for (const [k, v] of Object.entries(ACTIVITIES)) w[k] = v[band];
    w.hunt *= L.fight * (band === 0 ? L.night : 1); w.delve *= L.fight * L.roam; w.summit *= L.roam; w.social *= L.talk; w.errands *= h.bag > 3 ? 4 : 1;
    w.perform = h.person.cls === 'bard' ? w.perform * 3 : 0;
    if (h.bag > 8) { w.hunt = 0; w.delve = 0; w.summit *= 0.3; }
    // The duel: two in town, one of them wanting it.
    w.duel = band === 2 || band === 3 ? 0.15 * L.show : 0;
    let sum = 0;
    for (const v of Object.values(w)) sum += v;
    let r = Math.random() * sum, kind = 'social';
    for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) { kind = k; break; } }
    if (kind === 'hunt' || kind === 'delve' || kind === 'summit') return this.plan(h, kind);
    if (kind === 'duel') {
      const other = this.idleNear(h, 40, (o) => o.person.level >= h.person.level - 6);
      if (other) return this.startDuel(h, other);
      kind = 'social';
    }
    const spots = PLACES.filter((p) => p.kind === 'town' && (kind !== 'errands' || p.sell || p.id === 'square') && (kind !== 'rest' || p.rest || p.id === 'well') && (kind !== 'perform' || p.id === 'square' || p.id === 'well'));
    const place = pick(spots);
    h.task = { kind, place, t: 0, stay: kind === 'rest' ? rand(60, 160) : kind === 'perform' ? rand(40, 80) : rand(20, 70), sold: false };
    h.goal = this.spotIn(place, h);
  }

  spotIn(place, h) {
    const a = Math.random() * 6.28, r = Math.random() * place.r;
    return { x: place.spot[0] + Math.sin(a) * r, z: place.spot[1] + Math.cos(a) * r, speed: 1.5 + Math.random() * 0.4, stop: 0.6 };
  }

  idleNear(h, r, ok = () => true) {
    return this.heroes.find((o) => o !== h && o.active && !o.dead && !o.foe && !o.party && (!o.task || ['town', 'social', 'errands'].includes(o.task.kind)) && o.hold <= 0 && Math.hypot(o.x - h.x, o.z - h.z) < r && ok(o));
  }

  inTown(h, t, dt) {
    const sim = this.sim;
    t.t += dt;
    const at = !h.goal || Math.hypot(h.goal.x - h.x, h.goal.z - h.z) < 1;
    if (at) {
      // Arrived: errands done, a rest taken, a song started, or a while of standing about.
      if (t.kind === 'errands' && !t.sold && t.place.sell && h.bag > 0) {
        t.sold = true;
        const gold = h.bag * (5 + Math.floor(Math.random() * 12));
        h.person.gold += gold; h.bag = 0;
        h.say(sim, Math.random() < 0.5 ? 'town_sell' : 'town_repair', -1, PLACE_IDS.indexOf(t.place.id), -1, gold);
        h.gesture_('talk', 4);
      } else if (t.kind === 'rest' && !h.sitting && t.t > 2) {
        h.sitting = true; h.play('Sitting_Idle_Loop', 1, 'full', 0.4);
        if (Math.random() < 0.4) h.say(sim, this.hour >= 21 || this.hour < 5 ? 'well_night' : 'inn_rest', -1, PLACE_IDS.indexOf(t.place.id));
        if (Math.random() < 0.3) { h.away = true; h.say(sim, 'away'); }
      } else if (t.kind === 'perform' && !t.began && t.t > 1) {
        t.began = true; h.say(sim, 'bard_perform', -1, PLACE_IDS.indexOf(t.place.id));
        this.zones.push({ kind: 'song', owner: h, members: [], x: h.x, z: h.z, t: 0, life: t.stay, elem: ELEM.SPIRIT });
        // A crowd gathers, some dance, someone tips.
        for (const o of this.heroes) {
          if (o === h || !o.active || o.dead || o.foe || o.party || Math.hypot(o.x - h.x, o.z - h.z) > 30 || Math.random() < 0.45) continue;
          if (o.task && !['town', 'social', 'errands'].includes(o.task.kind)) continue;
          const a = Math.random() * 6.28;
          o.task = { kind: 'social', place: t.place, t: 0, stay: t.stay * 0.8, audience: h };
          o.goal = { x: h.x + Math.sin(a) * 3.2, z: h.z + Math.cos(a) * 3.2, speed: 1.6, face: Math.atan2(-Math.sin(a), -Math.cos(a)), stop: 0.6 };
          this.later(rand(4, 10), () => { if (o.task?.audience === h) { o.gesture_(Math.random() < 0.55 ? 'dance' : 'clap', rand(5, 12)); if (Math.random() < 0.35) o.say(sim, Math.random() < 0.5 ? 'dance' : 'bard_tip', h.slot); } });
        }
      } else if (t.kind === 'perform' && t.began && h.gestureT <= 0) h.gesture_('sing', 8);
      else if (h.gestureT <= -rand(3, 10) && !h.sitting && Math.random() < dt * 0.15 * h.lean.show) h.gesture_(pick(['look', 'fold', 'warm', 'talk', 'proud']), rand(3, 6));
      // Wander within the place now and then.
      if (!h.sitting && t.kind !== 'perform' && Math.random() < dt * 0.04) h.goal = this.spotIn(t.place, h);
      if (h.goal && Math.hypot(h.goal.x - h.x, h.goal.z - h.z) < 1) h.goal = null;
    }
    // Trade calls and show-offs carry across the town.
    if (Math.random() < dt * 0.004 * h.lean.show) h.say(sim, h.bag > 2 ? 'trade_call' : 'show_off');
    if (t.t > t.stay) {
      if (h.sitting) { h.sitting = false; h.stopAction(0.4); }
      if (h.away) { h.away = false; h.say(sim, 'back'); }
      h.task = null; h.goal = null;
    }
  }

  // ---- parties ----

  plan(h, kind) {
    const sim = this.sim;
    // Where: a hunting ground that suits their level, the cathedral, or the top of the hill.
    let place;
    if (kind === 'hunt') {
      const grounds = PLACES.filter((p) => p.kind === 'hunt' && p.mobs.some((m) => (MOBS[m]?.danger || 1) <= 1 + h.person.level / 6));
      place = pick(grounds.length ? grounds : PLACES.filter((p) => p.kind === 'hunt'));
    } else place = placeOf(kind === 'delve' ? 'cathedral' : 'summit');
    const solo = Math.random() < (kind === 'summit' ? 0.35 : 0.3) * (h.person.persona === 'quiet' ? 2 : 1);
    if (solo) {
      h.task = { kind, place, t: 0, going: true };
      h.say(sim, 'hunt_depart', -1, PLACE_IDS.indexOf(place.id));
      return;
    }
    const party = { id: this.partyId++, leader: h, members: new Set([h]), kind, place, state: 'forming', t: 0, want: 2 + Math.floor(Math.random() * 3) };
    this.parties.push(party);
    h.party = party;
    h.task = { kind: 'town', place: placeOf('well'), t: 0, stay: 1e9, forming: true };
    h.goal = this.spotIn(placeOf('well'), h);
    h.say(sim, 'party_call', -1, PLACE_IDS.indexOf(place.id), place.mobs ? MOB_KEYS.indexOf(place.mobs[0]) : -1);
  }

  stepParties(dt) {
    const sim = this.sim;
    for (const party of this.parties) {
      party.t += dt;
      const L = party.leader;
      if (party.state === 'forming') {
        // Anyone idle in town might come; some say no.
        if (party.members.size < party.want && Math.random() < dt * 0.5) {
          const o = this.idleNear(L, 70);
          if (o) {
            const fits = Math.random() < 0.55 * o.lean.fight + 0.15;
            if (fits) { party.members.add(o); o.party = party; o.task = { kind: 'town', place: placeOf('well'), t: 0, stay: 1e9 }; o.goal = this.spotIn(placeOf('well'), o); this.later(rand(0.5, 2), () => o.say(sim, 'party_join', L.slot)); if (o.guild && o.guild === L.guild) o.say(sim, 'greet_guild', L.slot); }
            else if (Math.random() < 0.3) o.say(sim, 'party_decline', L.slot);
          }
        }
        const gathered = [...party.members].every((m) => Math.hypot(m.x - L.x, m.z - L.z) < 8);
        if ((party.members.size >= party.want && gathered) || party.t > 45) {
          if (party.members.size < 2 && party.t > 45 && Math.random() < 0.5) { L.say(sim, 'party_disband'); this.disband(party); continue; }
          party.state = 'going'; party.t = 0;
          for (const m of party.members) m.task = { kind: party.kind, place: party.place, t: 0, going: true };
          L.say(sim, 'hunt_depart', -1, PLACE_IDS.indexOf(party.place.id));
        }
      }
    }
    this.parties = this.parties.filter((p) => !p.gone);
  }

  disband(party, wiped = false) {
    for (const m of party.members) { m.party = null; if (!wiped && !m.dead) { m.task = null; m.goal = null; } }
    party.gone = true;
  }

  // Followers keep near the leader; the leader leads.
  follow(h, t) {
    const L = h.party?.leader;
    if (!L || L === h || L.dead || !L.active) return false;
    const i = [...h.party.members].indexOf(h);
    const a = L.yaw + Math.PI + (i % 2 ? 0.7 : -0.7), r = 2 + Math.floor(i / 2) * 1.8;
    const x = L.x + Math.sin(a) * r, z = L.z + Math.cos(a) * r;
    const far = Math.hypot(x - h.x, z - h.z);
    h.goal = { x, z, speed: far > 6 ? 4.6 : Math.max(1.3, L.speed * 1.05), stop: 0.8 };
    return true;
  }

  // A way there: the road up the hill, the gate road east, or straight over the fields.
  route(h, place) {
    if (place.kind === 'summit') return LONG_ROAD.line.filter((_, i) => i % 3 === 0).map(([x, z]) => [x, z]).concat([place.spot]);
    const out = Math.hypot(place.spot[0], place.spot[1]);
    // Leave the town by the nearest gap in its ring, then across.
    const a = Math.atan2(place.spot[0], place.spot[1]);
    return out > TOWN_R ? [[Math.sin(a) * (TOWN_R - 6), Math.cos(a) * (TOWN_R - 6)], place.spot] : [place.spot];
  }

  travel(h, t, dt, speed) {
    if (this.follow(h, t)) return Math.hypot(h.party.leader.x - t.place.spot[0], h.party.leader.z - t.place.spot[1]) < t.place.r + 6;
    t.path ||= this.route(h, t.place);
    t.leg ??= 0;
    const [x, z] = t.path[Math.min(t.leg, t.path.length - 1)];
    h.goal = { x, z, speed, stop: 2 };
    if (Math.hypot(x - h.x, z - h.z) < 4 && t.leg < t.path.length - 1) t.leg++;
    if (Math.random() < dt * 0.01 * h.lean.talk) h.say(this.sim, 'travel_chatter', -1, PLACE_IDS.indexOf(t.place.id));
    return Math.hypot(t.place.spot[0] - h.x, t.place.spot[1] - h.z) < t.place.r + 4;
  }

  hunt(h, t, dt) {
    const sim = this.sim;
    t.t += dt;
    if (!t.there) {
      if (this.travel(h, t, dt, 3.4)) { t.there = true; t.t = 0; if (!h.party || h.party.leader === h) h.say(sim, 'hunt_arrive', -1, PLACE_IDS.indexOf(t.place.id), MOB_KEYS.indexOf(t.place.mobs[0])); }
      return;
    }
    // Looking for the ground's monsters: the leader picks the way, the rest follow it.
    if (!this.follow(h, t) && (!h.goal || Math.hypot(h.goal.x - h.x, h.goal.z - h.z) < 2)) {
      const live = this.targets.filter((m) => fightable(m) && t.place.mobs.includes(mobKind(m)) && Math.hypot(m.x - t.place.spot[0], m.z - t.place.spot[1]) < t.place.r + 40);
      const m = live.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0];
      t.live = live.length;
      if (m) { h.goal = { x: m.x, z: m.z, speed: 2.4, stop: 6 }; if (!t.sighted?.has(m) && Math.random() < 0.5) { (t.sighted ||= new Set()).add(m); h.say(sim, MOBS[mobKind(m)]?.sight || 'mob_sighted', -1, PLACE_IDS.indexOf(t.place.id), MOB_KEYS.indexOf(mobKind(m))); } }
      else h.goal = this.spotIn({ spot: t.place.spot, r: t.place.r }, h);
    }
    const lead = !h.party || h.party.leader === h;
    t.idle = !h.foe && t.live === 0 ? (t.idle || 0) + dt : 0;
    if (lead && h.near > VIEW && !h.foe) {
      // Out of the player's sight the ground's monsters are asleep (the woods keep their bodies for where the player is),
      // so a hunt there is told, not fought: a kill now and then, a few knocks, the same words and the same bag.
      t.abT = (t.abT ?? rand(15, 35)) - dt;
      if (t.abT <= 0) {
        const team = h.party ? [...h.party.members].filter((x) => !x.dead) : [h];
        t.abT = rand(20, 45) / Math.sqrt(team.length);
        const kind = pick(t.place.mobs), who = pick(team), danger = MOBS[kind]?.danger || 1;
        this.reward(who, kind);
        for (const x of team) x.hp = Math.max(x.maxHp * 0.2, x.hp - rand(0, 14) * danger / team.length);
        if (team.some((x) => x.hp < x.maxHp * 0.3)) { for (const x of team) this.goHome(x); return; }
      }
    } else if (lead && t.idle > 45) {
      // Picked clean: on to another ground that suits them, or home if the bags are worth the walk.
      if (h.bag >= 4) { for (const x of h.party ? h.party.members : [h]) this.goHome(x); return; }
      const grounds = PLACES.filter((q) => q.kind === 'hunt' && q !== t.place && q.mobs.some((k) => (MOBS[k]?.danger || 1) <= 1 + h.person.level / 6));
      if (grounds.length) {
        const np = pick(grounds);
        for (const x of h.party ? h.party.members : [h]) if (x.task?.kind === 'hunt') Object.assign(x.task, { place: np, there: false, path: null, leg: 0, idle: 0, t: 0, live: undefined });
        h.say(sim, 'hunt_depart', -1, PLACE_IDS.indexOf(np.id));
        return;
      }
    }
    // Home with full bags, after a long hunt, or when night comes on.
    if (lead && (h.bag >= 10 || t.t > 240 || (hourBand(this.hour) === 0 && h.lean.night < 1))) {
      if (h.bag >= 10) h.say(sim, 'bags_full');
      for (const m of h.party ? h.party.members : [h]) this.goHome(m);
    }
  }

  goHome(h, flee = false) {
    h.task = { kind: 'return', place: placeOf(Math.random() < 0.6 ? 'market' : 'well'), t: 0, flee };
    h.goal = null;
  }

  returning(h, t, dt) {
    const sim = this.sim;
    t.t += dt;
    if (!this.follow(h, t)) {
      const s = t.place.spot;
      h.goal = { x: s[0], z: s[1], speed: t.flee ? 5 : 3.2, stop: 3 };
    }
    const lead = !h.party || h.party.leader === h;
    if (Math.hypot(h.x - t.place.spot[0], h.z - t.place.spot[1]) < 8 || (h.party && !lead && Math.hypot(h.x, h.z) < 20)) {
      if (lead) h.say(sim, 'hunt_return', -1, PLACE_IDS.indexOf(t.place.id));
      if (h.party && lead) {
        const p = h.party;
        this.later(rand(3, 8), () => { if (!p.gone) { [...p.members][1]?.say(sim, 'party_leave', p.leader.slot); this.disband(p); } });
      }
      // Off to sell what's in the bags.
      h.task = { kind: 'errands', place: placeOf('market'), t: 0, stay: rand(15, 40), sold: false };
      h.goal = this.spotIn(placeOf('market'), h);
    }
  }

  // ---- the cathedral ----

  delve(h, t, dt) {
    const sim = this.sim;
    t.t += dt;
    if (!t.there) {
      if (this.travel(h, t, dt, 3.2)) { t.there = true; t.t = 0; if (!h.party || h.party.leader === h) h.say(sim, 'cathedral_approach'); }
      return;
    }
    // At the great door. Velscour's knight keeps it: a party holds him off and slips by; one alone waits for a chance.
    const door = t.place.door;
    const guard = sim.knights[0];
    const guarded = guard && !guard.dead && Math.hypot(guard.x - door[0], guard.z - door[1]) < 14;
    if (guarded && t.t < 40) {
      t.door = true;
      if (!h.party && t.t > 15) { h.say(sim, 'sight_black_knight'); this.goHome(h); return; }
      if (!h.foe) { h.foe = guard; h.say(sim, 'sight_black_knight', -1, -1, MOB_KEYS.indexOf('black_knight')); }
      return;
    }
    h.foe = null;
    h.goal = { x: door[0], z: door[1], speed: 3, stop: 1 };
    if (Math.hypot(door[0] - h.x, door[1] - h.z) < 2.2) {
      if (!h.party || h.party.leader === h) h.say(sim, 'cathedral_enter');
      h.below = 60 * rand(...DELVES.minutes);
      h.task = { kind: 'delve', place: t.place, below: true };
      this.later(rand(20, 60), () => { if (h.below > 30 && Math.random() < 0.5) h.say(sim, pick(['catacombs_descend', 'catacombs_crypts', 'rift_edge'])); });
    }
  }

  emerge(h) {
    const sim = this.sim, door = placeOf('cathedral').door;
    h.below = 0;
    h.x = door[0] - 3 + Math.random() * 2; h.z = door[1] + Math.random() * 2;
    h.y = sim.world.height(h.x, h.z);
    h.bag += 2 + Math.floor(Math.random() * (DELVES.loot[1] - DELVES.loot[0]));
    h.xp += 30;
    h.hp = Math.max(h.hp, h.maxHp * 0.4);
    h.say(sim, 'catacombs_exit');
    this.goHome(h);
  }

  // ---- the hill ----

  climb(h, t, dt) {
    const sim = this.sim;
    t.t += dt;
    if (!t.there) {
      if (Math.random() < dt * 0.008) h.say(sim, 'road_climb');
      if (this.travel(h, t, dt, 3.3)) { t.there = true; t.t = 0; t.view = rand(20, 45); h.say(sim, 'summit_view'); h.goal = this.spotIn(t.place, h); }
      return;
    }
    // At the top: the view, then the board. A party races.
    if (t.t > 6 && h.gestureT <= -4 && Math.random() < dt * 0.2) h.gesture_(pick(['look', 'point', 'cheer', 'warm']), 4);
    if (t.t > t.view && (!h.party || h.party.leader === h)) {
      const riders = h.party ? [...h.party.members].filter((m) => !m.dead && m.active) : [h];
      if (riders.length > 1) h.say(sim, 'surf_race_call');
      riders.forEach((m, i) => this.later(i * 0.6 + (riders.length > 1 ? 3 : 0.5), () => this.startSurf(m, i, riders.length > 1)));
      t.view = 1e9;
    }
  }

  startSurf(h, i, race) {
    if (h.dead || !h.active) return;
    const F = THE_FALL, n = F.line.length;
    h.task = { kind: 'surf', place: placeOf('summit'), t: 0, race, peace: true };
    h.surf = { i: n - 1, d: F.s[n - 1] - 26, v: 4, lane: (i - 1.5) * 1.6, wob: Math.random() * 6, foot: Math.random() < 0.7 ? 1 : -1, hitSet: new Set(), crash: 0, t0: this.sim.time };
    h.foe = null; h.goal = null;
    h.say(this.sim, 'surf_start');
    this.sim.event(EV.JUMP, h.x, h.y, h.z);
  }

  surfDone(h) {
    const sim = this.sim, race = h.task?.race, party = h.party;
    h.surf = null; h.stopAction(0.2);
    h.y = sim.world.height(h.x, h.z);
    if (race && party) {
      party.finish ||= [];
      party.finish.push(h);
      h.say(sim, party.finish.length === 1 ? 'surf_win' : 'surf_lose', party.finish[0].slot);
    } else h.say(sim, 'surf_finish');
    this.goHome(h);
  }

  // ---- duels in the square ----

  startDuel(a, b) {
    const sim = this.sim, sq = placeOf('square');
    const duel = { a, b, t: 0, x: sq.spot[0], z: sq.spot[1], hpA: a.hp, hpB: b.hp };
    this.duels.push(duel);
    a.task = { kind: 'duel', duel, peace: true }; b.task = { kind: 'duel', duel, peace: true };
    a.say(sim, 'duel_challenge', b.slot);
  }

  duel(h, t, dt) {
    const sim = this.sim, d = t.duel, other = d.a === h ? d.b : d.a;
    d.t += dt / 2;
    if (other.dead || !other.active || other.task?.duel !== d) { h.task = null; return; }
    const side = d.a === h ? 1 : -1;
    if (d.t < 6) { h.goal = { x: d.x + side * 2.2, z: d.z, speed: 1.6, face: Math.atan2(other.x - h.x, other.z - h.z), stop: 0.4 }; return; }
    // Blows that count but don't kill: first to be put down to a third yields.
    const dist = Math.hypot(other.x - h.x, other.z - h.z);
    h.faceYaw = Math.atan2(other.x - h.x, other.z - h.z);
    h.combat = 1;
    if (dist > 2.2) h.goal = { x: other.x, z: other.z, speed: 2.4, stop: 1.8 };
    else if (!h.swing && h.shotCd <= 0) {
      const b = pick(h.blows);
      h.startSwing(b.clip, b.rate, b.hit, () => { if (Math.hypot(other.x - h.x, other.z - h.z) < 2.6) { other.hp -= 6 + h.person.level * 0.3; if (!other.swing) other.play('Hit_Chest', 1.4, 'upper', 0.05); sim.event(EV.BITE, other.x, other.y + 1.1, other.z, 0.3); } });
      h.shotCd = rand(0.9, 1.8);
    }
    if (other.hp < other.maxHp * 0.33 || d.t > 70) {
      const win = other.hp < other.maxHp * 0.33 ? h : (h.hp > other.hp ? h : other);
      const lose = win === h ? other : h;
      win.say(sim, 'duel_win', lose.slot); this.later(1.5, () => lose.say(sim, 'duel_lose', win.slot));
      sim.event(EV.HERO_DUEL, win.slot, lose.slot);
      for (const x of [h, other]) { x.task = null; x.goal = null; x.combat = 0; x.hp = Math.max(x.hp, x.maxHp * 0.3); }
      win.gesture_('cheer', 3); lose.gesture_('defeat', 3);
      this.duels = this.duels.filter((x) => x !== d);
    }
  }

  // ---- meetings: two heroes idle near each other, the words side finds them a conversation ----

  stepMeetings(dt) {
    const sim = this.sim;
    for (const h of this.heroes) {
      h.meetT -= dt;
      if (h.meetT > 0 || !h.active || h.dead || h.foe || h.hold > 0 || h.swing || h.surf) continue;
      if (h.task && !['town', 'social', 'errands', 'rest'].includes(h.task.kind) && !(h.task.there && h.task.kind === 'summit')) { h.meetT = 5; continue; }
      const o = this.heroes.find((x) => x !== h && x.active && !x.dead && !x.foe && x.hold <= 0 && !x.swing && !x.surf && Math.hypot(x.x - h.x, x.z - h.z) < 7);
      h.meetT = rand(25, 70) / h.lean.talk;
      if (!o) continue;
      o.meetT = Math.max(o.meetT, 20);
      sim.event(EV.HERO, h.slot, TRIG.meet, o.slot, -1, -1, 0, 0);
    }
  }

  // The words side asks a hero to walk with the player a while: one the player saved, one who offered as the player
  // set out, or (mode 'edge', by night) a romantic trailing the player and the lady as far as the edge of town.
  walkFor(slot, seconds, mode = 'escort') {
    const h = this.heroes[slot];
    if (!h || !h.active || h.dead || h.party || h.surf || h.task?.kind === 'duel') return;
    h.walkWith = { until: this.sim.time + seconds, mode, side: h.slot % 2 ? 1 : -1 };
    h.hold = 0;
  }

  // A few steps behind the player and to one side; catching up at a run when left behind. Done when the time's up,
  // when the player is lost or down, when a party calls, or, for 'edge', at the town's edge.
  walking(h) {
    const sim = this.sim, p = sim.player, w = h.walkWith;
    const d = Math.hypot(p.x - h.x, p.z - h.z);
    const edge = w.mode === 'edge' && Math.hypot(p.x, p.z) > TOWN_R;
    if (sim.time > w.until || p.dead || h.party || d > 45 || edge) {
      h.walkWith = null; h.goal = null; h.hold = edge ? 2.5 : 0.6;
      h.holdFace = Math.atan2(p.x - h.x, p.z - h.z);
      // Why it ended goes with the line (WALK_ENDS): the time, a party calling, or the town's edge. Lost or down: nothing.
      // (A night trail that never reached the edge: she stayed in town, so he gave up.)
      const why = edge ? 'edge' : h.party ? 'party' : w.mode === 'edge' ? 'gave_up' : 'time';
      if (d <= 45 && !p.dead) h.say(sim, 'player_walk_end', -1, -1, -1, WALK_ENDS.indexOf(why));
      return true;
    }
    // Behind the way the player is going (or, standing still, on the side the hero is already on).
    const pv = Math.hypot(p.vx || 0, p.vz || 0);
    const bx = pv > 0.5 ? -(p.vx / pv) : (h.x - p.x) / (d || 1), bz = pv > 0.5 ? -(p.vz / pv) : (h.z - p.z) / (d || 1);
    const back = w.mode === 'edge' ? 7 : 3.2;
    const x = p.x + bx * back - bz * 1.6 * w.side, z = p.z + bz * back + bx * 1.6 * w.side;
    const far = Math.hypot(x - h.x, z - h.z);
    h.goal = { x, z, speed: far > 8 ? 5.4 : far > 3 ? Math.max(1.5, pv * 1.1) : Math.max(1.2, pv), stop: 0.9, face: pv > 0.5 ? Math.atan2(p.vx, p.vz) : Math.atan2(p.x - h.x, p.z - h.z) };
    if (h.sitting) { h.sitting = false; h.stopAction(0.4); }
    return true;
  }

  // The words side asks two (or more) to stand and talk for a while: facing each other, gestures on cue.
  holdFor(slots, seconds) {
    const hs = slots.map((s) => this.heroes[s]).filter((h) => h && h.active && !h.dead && !h.foe && !h.walkWith);
    if (hs.length < 1) return;
    const cx = hs.reduce((a, h) => a + h.x, 0) / hs.length, cz = hs.reduce((a, h) => a + h.z, 0) / hs.length;
    for (const h of hs) {
      h.hold = seconds;
      const other = hs.find((o) => o !== h);
      h.holdFace = other ? Math.atan2(other.x - h.x, other.z - h.z) : Math.atan2(cx - h.x, cz - h.z);
      h.goal = null;
      if (h.sitting) continue;
    }
  }

  act(slot, name, seconds) { const h = this.heroes[slot]; if (h) h.gesture_(name, seconds); }

  // Keep the town's hours with the render thread's clock (it owns the sun).
  setHour(h) { this.hour = h; }

  // Review commands from the render thread (bm.heroes in src/main.js), for staging a scene and reading what everyone's doing.
  debug(m) {
    const sim = this.sim, p = sim.player, hs = m.slot === undefined || m.slot < 0 ? this.heroes : [this.heroes[m.slot]].filter(Boolean);
    const place = (h, x, z) => { h.x = h.lastX = x; h.z = h.lastZ = z; h.y = sim.world.height(x, z); h.vx = h.vz = 0; h.goal = null; };
    switch (m.cmd) {
      case 'near': hs.forEach((h, i) => { const a = p.yaw + (i - (hs.length - 1) / 2) * Math.min(0.35, 1.7 / Math.max(1, hs.length - 1)); place(h, p.x + Math.sin(a) * (m.r || 7), p.z + Math.cos(a) * (m.r || 7)); h.yaw = h.faceYaw = Math.atan2(p.x - h.x, p.z - h.z); }); break;
      case 'at': hs.forEach((h, i) => place(h, m.x + (i % 4) * 1.6, m.z + Math.floor(i / 4) * 1.6)); break;
      case 'task': hs.forEach((h) => { if (h.party) this.disband(h.party); h.task = null; h.foe = null; if (['hunt', 'delve', 'summit'].includes(m.kind)) this.plan(h, m.kind); }); break;
      case 'surf': hs.forEach((h, i) => { const top = THE_FALL.line[THE_FALL.line.length - 1]; place(h, top[0], top[1]); this.startSurf(h, i, hs.length > 1); }); break;
      case 'gesture': hs.forEach((h) => h.gesture_(m.name, m.seconds)); break;
      case 'skill': hs.forEach((h) => { const f = this.targets.filter(fightable).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; if (f) { h.foe = f; h.skill(sim, m.key, f); } }); break;
      // A staged fight: the nearest living monster (of kind m.mob, if given) to the player, with these heroes around it.
      case 'fight': {
        const f = this.targets.filter((t) => fightable(t) && !t.dead && (!m.mob || mobKind(t) === m.mob)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (!f) break;
        hs.forEach((h, i) => { const a = (i / hs.length) * Math.PI * 2; place(h, f.x + Math.sin(a) * (m.r || 7), f.z + Math.cos(a) * (m.r || 7)); h.hold = 0; h.foe = f; h.yaw = h.faceYaw = Math.atan2(f.x - h.x, f.z - h.z); });
        break;
      }
      case 'freeze': hs.forEach((h) => { h.hold = m.seconds ?? 1e9; h.holdFace = m.face; }); break;
      case 'dump': self.postMessage({ type: 'heroState', id: m.id, heroes: this.heroes.map((h) => ({ slot: h.slot, name: h.person.name, cls: h.person.cls, x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), yaw: +h.yaw.toFixed(2), hp: Math.round(h.hp), task: h.task?.kind || null, there: !!h.task?.there, party: h.party?.id ?? null, foe: h.foe ? mobKind(h.foe) : null, foeAt: h.foe ? [+h.foe.x.toFixed(1), +(h.foe.y || 0).toFixed(1), +h.foe.z.toFixed(1)] : null, dead: h.dead, below: h.below > 0, surf: !!h.surf, kills: h.kills, bag: h.bag, level: h.person.level, near: Math.round(h.near || 0), action: h.action?.name || null, goal: h.goal ? [Math.round(h.goal.x), Math.round(h.goal.z)] : null, leg: h.task?.leg ?? null, legs: h.task?.path?.length ?? null, tt: Math.round(h.task?.t || 0), place: h.task?.place?.id || null, spd: +Math.hypot(h.vx || 0, h.vz || 0).toFixed(1), follow: h.party && h.party.leader !== h ? h.party.leader.slot : null, walk: h.walkWith?.mode || null, hold: +Math.max(0, h.hold).toFixed(1), sit: h.sitting })) }); break;
      default: break;
    }
  }
}
