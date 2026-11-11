// The other Tessariels, as bodies: AI adventurers living their own MMO in Bellmourn (see src/core/heroes.js for who they are
// and how to send them somewhere new). Each is a knight on the UAL skeleton (src/sim/knight.js does the layered animation,
// the hands and the ground) with a brain of its own: what to do with the day, who to do it with, and how its class fights.
//
// They are not in sim.knights, so nothing of the player's (spells, blows, loot) ever touches them. Monsters they strike
// turn on them (src/sim/foes.js). What they say is chosen on the render thread (src/ui/heroes.js) from the triggers they
// raise here as EV.HERO events: (slot, trigger, other slot, place, mob, extra).
import { CAUSES, CLASSES, MOVE_KEYS, DELVES, GESTURES, LONG_ROAD, MOBS, MOB_KEYS, PERSONAS, PLACES, PLACE_IDS, THE_FALL, ACTIVITIES, TRIG, WALK_ENDS, hourBand, placeOf, rng } from '../core/heroes.js';
import { C, C_HERO, C_PROPS, EV } from '../core/layout.js';
import { clamp, damp, mat4FromQT, quatAxisAngle, quatMul, quatNlerp, quatRotate, wrapAngle } from '../core/math.js';
import { floorAt, inPit } from '../core/interior.js';
import { ELEM, FX, FX_CARRIED } from './spells.js';
import { DAWN_HOUR, DUSK_HOUR } from '../gfx/daylight.js';
import { Knight, S, matToQuat, norm, orth, cross, turn } from './knight.js';
import { Caster, Zombie } from './undead.js';
import { townDist } from '../core/town.js';

import { Crab } from './crab.js';
import { Gravehart } from './gravehart.js';
import { Hydra } from './hydra.js';
import { FieldCreature } from './field-creature.js';
import { Pose, solveFK } from './anim.js';
import { BROKER_SPOTS, PORTAL, inDungeon, roleOf } from '../core/dungeon.js';
import { foeOf } from './foes.js';
import { cleanLine } from './sight.js';
import { MORE_SKILLS, arrive, arrow3, castSkill, chooseSkill, classRoutine, cutArc, diveDraw, hammer3, install, pike3, pluckNote, rank, stepShotX, strumFx, tintOf } from './heroskills.js';

const STRING_ELEM = { gold: ELEM.LIGHT, azure: ELEM.FROST, emerald: ELEM.HEAL, violet: ELEM.ARCANE, crimson: ELEM.DRAIN, silver: ELEM.SPIRIT, ember: ELEM.FIRE, rose: ELEM.STORM };
const GAP = 1.2;                 // hips to hips, hero to anything
const VIEW = 170;                // past this from the player a hero isn't drawn, and only thinks
const RESPAWN = [150, 300];      // seconds before something a hero killed stands again, MMO-style
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
// Gestures the whole body makes: never begun on the move, and stopped if the hero sets off.
const WHOLE_BODY = new Set(['dance', 'sit', 'kneel', 'bow', 'hug', 'defeat', 'cry', 'warm', 'sing']);

// What a monster is, to a hero.
export function mobKind(m) {
  if (m instanceof Hydra) return 'hydra';
  if (m instanceof Gravehart) return 'gravehart';
  if (m instanceof Crab) return 'crab';
  // (A Tripo monster, src/sim/tripo.js, has its meta: the heroes know the werewolf by name, the rest as monsters.)
  if (m instanceof FieldCreature) return m.opts.name === 'WEREWOLF' ? 'werewolf' : m.meta ? null : 'mouth';
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

// (A Tripo monster has its own girth: a dragon's is far past a goblin's.)
const radiusOf = (m) => (m instanceof Gravehart ? 2.2 : m instanceof FieldCreature ? Math.max(0.6, m.meta ? m.opts.radius * 1.2 : 1) : m.scale > 1.2 ? 1 : m instanceof Crab ? 1.4 : 0.5);

// ---- class moves ----------------------------------------------------------------------------------------------------
// clip: from the heroes' bank. hit: when in the clip it lands (fractions). dmg: before level. reach: past the hips.
const BLOWS = {
  two_hand: [{ clip: 'Sword_Attack', rate: 0.95, hit: [0.24], dmg: 16, reach: 2.4, end: 0.55 }, { clip: 'L_Chop', rate: 1.4, from: 0.25, hit: [0.6], dmg: 15, reach: 2.3 }, { clip: 'Sword_Regular_C', rate: 0.9, hit: [0.33], dmg: 14, reach: 2.5 }],
  sword_board: [{ clip: 'Sword_Regular_A', rate: 0.8, hit: [0.55], dmg: 10, reach: 2.1 }, { clip: 'Sword_Regular_B', rate: 0.8, hit: [0.48], dmg: 10, reach: 2.0 }, { clip: 'L_ShieldJab', rate: 1.1, hit: [0.55], dmg: 6, reach: 1.5, knock: 4 }],
  // (A lance or a spear goes in point first: a straight arm down the line, the body behind it. THRUST below.)
  lance: [{ clip: 'Punch_Cross', rate: 1.15, hit: [0.42], dmg: 14, reach: 3.1, thrust: true }, { clip: 'L_ShieldJab', rate: 1.1, hit: [0.55], dmg: 7, reach: 1.6, knock: 5 }, { clip: 'Punch_Cross', rate: 1.35, hit: [0.42], dmg: 11, reach: 2.9, thrust: true }],
  // (Knives cut: slashes, a hook from the off hand, an overhand rip. Not a fist held out over its head.)
  daggers: [{ clip: 'Sword_Regular_A', rate: 1.5, hit: [0.55], dmg: 6, reach: 1.5, end: 0.8 }, { clip: 'Sword_Regular_B', rate: 1.5, hit: [0.48], dmg: 7, reach: 1.5, end: 0.8 }, { clip: 'Melee_Hook', rate: 1.1, hit: [0.5], dmg: 8, reach: 1.4 }, { clip: 'L_Slash', rate: 1.6, from: 0.3, hit: [0.65], dmg: 9, reach: 1.6 }],
  spear: [{ clip: 'Punch_Cross', rate: 1.2, hit: [0.42], dmg: 13, reach: 2.9, thrust: true }, { clip: 'L_Chop', rate: 1.4, from: 0.25, hit: [0.6], dmg: 12, reach: 2.4 }, { clip: 'Punch_Cross', rate: 1.5, hit: [0.42], dmg: 9, reach: 2.6, thrust: true }],
  boomerang: [{ clip: 'Punch_Jab', rate: 1.15, hit: [0.4], dmg: 6, reach: 1.4 }, { clip: 'L_SnapKick', rate: 1.1, hit: [0.6], dmg: 6, reach: 1.6, knock: 5 }],
  blade: [{ clip: 'Sword_Regular_A', rate: 0.85, hit: [0.55], dmg: 9, reach: 2.0 }, { clip: 'Sword_Regular_B', rate: 0.85, hit: [0.48], dmg: 9, reach: 1.9 }, { clip: 'L_Slash', rate: 1.1, hit: [0.65], dmg: 10, reach: 2.0 }],
  bow: [{ clip: 'L_SnapKick', rate: 1.1, hit: [0.6], dmg: 5, reach: 1.6, knock: 6 }],
  ninja: [{ clip: 'L_SnapKick', rate: 1.15, hit: [0.6], dmg: 8, reach: 1.7, knock: 4 }, { clip: 'Sword_Regular_A', rate: 1.6, hit: [0.55], dmg: 6, reach: 1.5, end: 0.8 }, { clip: 'Sword_Regular_B', rate: 1.6, hit: [0.48], dmg: 7, reach: 1.5, end: 0.8 }, { clip: 'LP_front_kick_01', rate: 1.1, hit: [0.45], dmg: 8, reach: 1.7 }],
};

// What a class's ordinary blows are called, for the words (class_skill).
const BLOW_MOVE = { lancer: 'lance_thrust', archer: 'aimed_shot', rogue: 'flurry', ninja: 'ninja_flurry', dragoon: 'spear_combo', boomerang: 'throw', paladin: null, bard: null };

// Each class's special moves: how often, and what they need. The words name them by these keys (class_skill, extra).
// The first one ready that fits is used, so each list runs in order of what the class reaches for first. They follow how
// the classes play in Velscour (the isometric game): the paladin's hammers spiral round him as his main attack, the
// dragoon leaps again and again and then plants a ring of spears, the archer keeps her distance and rains arrows.
// crowd: that many standing near the foe (orUndead: or the foe is one of the dead). after: only once the class's
// rhythm says so (the dragoon's barrage, after so many leaps).
export const SKILLS = {
  paladin: [{ key: 'blessed_hammers', cd: 4, range: [0, 3] }, { key: 'hammer_throw', cd: 7, range: [3, 16] }, { key: 'smite', cd: 6, range: [0, 1.6] }, { key: 'consecration', cd: 15, range: [0, 3.5], crowd: 2, orUndead: true }, { key: 'holy_light', cd: 9, heal: true }],
  lancer: [{ key: 'charge', cd: 8, range: [4, 9] }, { key: 'shield_wall', cd: 16, range: [0, 6], crowd: 3 }, { key: 'shield_bash', cd: 7, range: [0, 1.6] }],
  archer: [{ key: 'rain_of_arrows', cd: 14, range: [5, 20], crowd: 2 }, { key: 'volley', cd: 9, range: [4, 20], crowd: 2 }, { key: 'strafe', cd: 5, range: [2, 14] }],
  rogue: [{ key: 'vanish', cd: 13, range: [0, 8] }, { key: 'flurry', cd: 5, range: [0, 1.4] }],
  ninja: [{ key: 'shadow_step', cd: 9, range: [4, 9.7] }, { key: 'leaping_kick', cd: 7, range: [2.5, 7] }, { key: 'throwing_stars', cd: 6, range: [4, 15] }, { key: 'ninja_flurry', cd: 6, range: [0, 1.5] }],
  dragoon: [{ key: 'spear_barrage', cd: 8, range: [0, 2.6], after: true }, { key: 'jump', cd: 2.6, range: [0, 12] }],
  boomerang: [{ key: 'double_throw', cd: 10, range: [3, 8] }],
  bard: [{ key: 'war_song', cd: 30, song: true }, { key: 'marching_song', cd: 40, song: true, travel: true }, { key: 'mending_song', cd: 26, song: true, heal: true }],
};
// Leaps and dashes: how a class flies at its foe (see Hero.leap). T: seconds in the air. apex: metres up. r: the landing's reach.
const LEAPS = {
  jump: { T: 0.66, apex: 1.9, r: 2, dmg: 14, elem: ELEM.SPIRIT, lance: true, snap: true, air: 'NinjaJump_Idle_Loop', draw: diveDraw(ELEM.SPIRIT) },
  leaping_kick: { T: 0.6, apex: 2.2, r: 2.7, dmg: 12, elem: ELEM.SPIRIT, air: 'LP_front_kick_02', airRate: 1.6 },
};
const BLEED = 3;                 // seconds a bleeding cut runs, at 30% of the blow each second (Velscour's)
// Who goes round behind what someone else is holding (a knife in the back counts nearly double: backstab).
const FLANKERS = new Set(['rogue', 'ninja']);
// What needs a clear line to its foe, past its own reach: anything shot, thrown, charged or leapt. (The rest is done where it stands.)
const LINE_SKILLS = new Set(['hammer_throw', 'charge', 'volley', 'strafe', 'rain_of_arrows', 'throwing_stars', 'shadow_step', 'leaping_kick', 'jump', 'double_throw', 'vanish']);

// ---- the body -------------------------------------------------------------------------------------------------------

export class Hero extends Knight {
  constructor(slot, rig, bank, person, props) {
    const cls = CLASSES[person.cls];
    super(100 + slot, 1, rig, bank, { spawn: [-1.5 + Math.sin(slot) * 6, 4 + Math.cos(slot) * 6], yaw: slot, hp: cls.hp, style: 'silver', swordScale: 1, shieldScale: 1, bladeLen: 1, walk: 1.4, hero: true });
    this.slot = slot; this.person = person; this.cls = cls; this.style = person.kit.style;
    this.bodyRadius = 0.42;
    this.propMatrices = new Float32Array(64);
    const P = (id) => (id ? { id, ...props[id] } : null);
    this.mainP = P(person.kit.main); this.offP = P(person.kit.off); this.backP = P(person.kit.back);
    this.shieldStyle = this.style === 'lance' || this.style === 'sword_board';
    this.stringElem = STRING_ELEM[person.kit.string] ?? ELEM.LIGHT;
    this.blows = this.style === 'daggers' && person.cls === 'ninja' ? BLOWS.ninja : BLOWS[this.style] || BLOWS.blade;
    this.skills = [...(SKILLS[person.cls] || []), ...(MORE_SKILLS[person.cls] || [])].map((s) => ({ ...s, t: rand(1, s.cd) }));
    this.lean = PERSONAS[person.persona] || PERSONAS.earnest;
    // The colour of the class: what its blows spark where they land.
    this.hitElem = { paladin: ELEM.LIGHT, lancer: ELEM.STORM, archer: this.stringElem, rogue: ELEM.DRAIN, ninja: ELEM.ARCANE, boomerang: ELEM.LIGHT, bard: ELEM.ARCANE }[person.cls] ?? tintOf({ person });
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
    // The joints of each arm, for the hands' own work (afterPose): shoulder, elbow, wrist, and the fingers that go with the wrist.
    const ji = (n) => rig.index.get(n);
    const under = (top) => { const out = []; for (let j = 0; j < rig.count; j++) { let k = rig.parent[j]; while (k >= 0 && k !== top) k = rig.parent[k]; if (k === top) out.push(j); } return out; };
    this.arms = { l: { u: ji('upperarm_l'), f: ji('lowerarm_l'), h: ji('hand_l'), fingers: under(ji('hand_l')) }, r: { u: ji('upperarm_r'), f: ji('lowerarm_r'), h: ji('hand_r'), fingers: under(ji('hand_r')) } };
    this.upperBody = [ji('spine_01'), ...under(ji('spine_01'))];
    this.headBits = [this.J.head, ...under(this.J.head)];
    // A bard's lute, the fourth thing carried: across the back, over the board, till it's played; then before the belly, its
    // neck up to the left, the left hand on the neck and the right at the strings. Both places are found once on this body
    // at rest, and kept by the chest. The sword goes to the left hip while both hands are on the lute.
    this.luteP = P(person.kit.lute);
    if (this.luteP) {
      const pose = new Pose(rig), u = rig.height / 1.8;
      pose.rot.set(rig.restR); pose.pelvis.set(bank.pelvisRest);
      bank.sample(bank.clips.Idle_Loop, 0, pose.rot, pose.pelvis);
      solveFK(pose, 0, 0, 0, 0, null, null);
      const hold = (j, y, z, at) => {
        const sq = pose.wq.subarray(j * 4, j * 4 + 4), inv = [-sq[0], -sq[1], -sq[2], sq[3]];
        const q = new Float32Array(4), t = new Float32Array(3);
        quatMul(q, 0, inv, 0, frame(y, z), 0);
        quatRotate(t, 0, inv, 0, [at[0] - pose.wt[j * 3], at[1] - pose.wt[j * 3 + 1], at[2] - pose.wt[j * 3 + 2]], 0);
        return [q, t];
      };
      const j = this.J.spine3, sy = pose.wt[j * 3 + 1], L = this.luteP;
      // (Facing is +Z, his left +X. The lute's own axes: +Y up its neck, +Z out of the soundboard.)
      [this.lutePlayQ, this.lutePlayT] = hold(j, [0.8, 0.52, 0.3], [-0.14, 0.36, 0.92], [-0.1 * u, sy - 0.33 * u, 0.115 * u + L.depth * 0.82]);
      [this.luteBackQ, this.luteBackT] = hold(j, [-0.5, 0.86, -0.08], [0, 0.12, 1], [0.1 * u, sy - 0.2 * u, -0.34 * u]);
      const pj = this.J.pelvis;
      [this.sheathQ, this.sheathT] = hold(pj, [0.12, -0.86, -0.5], [1, 0.1, 0], [0.2 * u, pose.wt[pj * 3 + 1] + 0.02 * u, 0.03 * u]);
    }
    // (A quartermaster of the Free Company: stands at a post and hires out the party: HeroWorld.atPost.)
    this.broker = person.broker || null;
    this.heroReset();
  }

  heroReset() {
    Object.assign(this, {
      task: null, goal: null, party: null, foe: null, swing: null, hold: 0, holdFace: null, gestureT: 0, idleT: rand(2, 12),
      hidden: false, below: 0, ghostT: 0, surf: null, air: 0, airV: 0, jump: null, buff: null, buffT: 0, hurtSay: false,
      kills: 0, bag: 0, xp: 0, stuckT: 0, lastX: this.x, lastZ: this.z, meetT: rand(10, 40), lastSay: -99, aimT: 0, draw: 0,
      shotCd: 0, animTick: 0, losT: 0, clear: true, fieldAt: null, vanishT: 0, playerSeen: false, helpT: 0, visible: true, animT: 0, sitting: false, talkUntil: 0,
      iframesT: 0, guardT: 0, kiteT: 0, charge: null, leaps: 0, leapGoal: 3 + Math.floor(Math.random() * 4),
      dodgeT: 0, post: null, reviveT: 0, tauntCd: 0, healCd: 0, bigHealCd: 0, lineT: 0, line: true, lineFoe: null,
      // The moves past the first ones (src/sim/heroskills.js). gcd: a breath between two of them. bodyFlip, bodyRoll,
      // bodySpin: the whole body turned over forward, sideways and about, in a leap. aim: where the main hand's weapon is
      // pointed, whatever the fist is doing. free: a thing out of its hand (a thrown board, a spear in the ground), as a matrix.
      // tune: the lute being played. luteW: how far it is from the back to the hands. skirm: a rogue's or a ninja's in and out.
      gcd: rand(0.5, 2), used: {}, bodyFlip: 0, bodyRoll: 0, bodySpin: 0, aim: null, free: [null, null, null, null], tune: null, luteW: 0,
      skirm: null, tumbleCd: 0, combo: 0, ward: 0, wardT: 0,
      // What the arms do that no clip has (afterPose). point: the weapon arm out along a line, the weapon down it. tossing: an
      // arm thrown with no clip in it. bowW, pull, bowPitch: the bow arm up, the string hand back, how high it's aimed
      // (bowLoftT: at the sky, for an arrow meant to fall). spread: both arms held wide. gripAt: a hand kept on a spear
      // standing in the ground. nock: the arrow on the string.
      point: null, tossing: null, bowW: 0, pull: 0, bowUntil: 0, bowLoftT: 0, bowPitch: 0, spread: 0, spreadT: 0, gripAt: null, nock: null,
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
  damage(sim, amount, fromX, fromZ, knock = 0, unblockable = false) {
    // (Untouchable for a moment in the air of a leap, or through a dash: Velscour's heroes are. The Free Company's
    // quartermasters aren't in anyone's fight.)
    if (this.dead || !this.active || this.surf || this.iframes || this.iframesT > 0 || this.broker) return false;
    // Plate, mail or leather: a lancer shrugs off what a rogue can't. A raised shield takes most of it from the front.
    const armor = { lancer: 0.6, paladin: 0.7, dragoon: 0.8 }[this.person.cls] ?? 0.9;
    const front = Math.abs(wrapAngle(Math.atan2(fromX - this.x, fromZ - this.z) - this.faceYaw)) < 1.1;
    // A shield wall (the lancer's) turns most of it from any side, for a few seconds.
    // (A hired tank's board turns about half: enough to hold a boss with a healer behind him, not so much he needs none.
    // What falls from the roof or burns on the floor no board stops.)
    const guard = unblockable ? 1 : this.hired ? (this.shieldUp > 0.6 && front ? 0.65 : 1) * (this.guardT > 0 ? 0.6 : 1)
      : (this.shieldUp > 0.6 && front ? 0.25 : 1) * (this.guardT > 0 ? 0.4 : 1);
    let hurt = amount * armor * guard * (this.party && !this.hired ? 0.8 : 1);
    // (A ward of light, a paladin's or a bard's, takes what it can first.)
    if (this.ward > 0) { const took = Math.min(this.ward, hurt); this.ward -= took; hurt -= took; if (this.fxOk()) sim.casting.burst(FX.SHOCK, ELEM.LIGHT, this.x, this.y + 1.1, this.z, 0.5, 1.1, 0.25); }
    this.hp -= hurt;
    this.lastHitBy = { x: fromX, z: fromZ, t: sim.time };
    if (knock > 0) { const dx = this.x - fromX, dz = this.z - fromZ, L = Math.hypot(dx, dz) || 1; this.knockX = dx / L; this.knockZ = dz / L; this.knock = Math.min(knock, 5); }
    // Thrown back, the whole body staggers with it (the legs never run on the spot while the hips slide); a plain hit is in the chest.
    if (knock > 1.5 && this.bank.clips.Hit_Knockback && !this.surf && !this.jump) {
      if (this.gesture) this.gesture = null;
      this.swing = null; this.speed = 0; this.play('Hit_Knockback', 1.05, 'full', 0.06);
    } else if (!this.swing && !this.action) this.play(Math.random() < 0.5 ? 'L_HitBody' : 'Hit_Chest', 1.4, 'upper', 0.05);
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
    this.aim = null; this.bodyFlip = 0; this.bodyRoll = 0; this.charge = null; this.tune = null; this.skirm = null;
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
    this.iframesT -= dt; this.guardT -= dt; this.kiteT -= dt; this.dodgeT -= dt; this.tauntCd -= dt; this.healCd -= dt; this.bigHealCd -= dt;
    if (this.buffT <= 0) this.buff = null;
    this.gcd -= dt; this.tumbleCd -= dt; this.wardT -= dt;
    // (A weapon is pointed only while the move that pointed it lasts, however that move ends.)
    if (this.aim && !this.swing?.aimed && !this.jump && !this.charge) this.aim = null;
    this.aimBack = 0;
    // (A lancer in a fight carries the lance point up and forward between blows, not level through whatever stands before him.)
    if (this.style === 'lance' && this.foe && !this.swing && !this.jump && !this.charge && !this.dead) this.aim = [Math.sin(this.yaw) * 0.55, 0.83, Math.cos(this.yaw) * 0.55];
    if (this.wardT <= 0) this.ward = 0;
    // (An arm put out along a line, an arm thrown, arms held wide: each for as long as its move asked, however that move ends.)
    if (this.point) { const q = this.point; q.t += dt; if (q.t >= q.dur || this.dead) this.point = null; else if (q.aim) this.aim = q.d; }
    if (this.tossing) { const q = this.tossing; q.t += dt; if (!q.done && q.t >= q.dur * 0.5) { q.done = true; if (!this.dead) q.fn?.(); } if (q.t >= q.dur || this.dead) this.tossing = null; }
    this.bowLoftT -= dt; this.spreadT -= dt;
    this.spread = damp(this.spread, this.spreadT > 0 && !this.dead ? 1 : 0, 16, dt);
    if (this.tune) { this.tune.t += dt; if (this.tune.t >= this.tune.dur || this.dead) this.tune = null; else if (this.visible) strumFx(this, sim, dt); }
    this.luteW = damp(this.luteW, this.tune && !this.dead ? 1 : 0, this.tune ? 12 : 7, dt);
    if (this.dead) return this.updateDead(dt, sim, world);
    if (this.below) return this.updateBelow(dt, sim, world);
    this.hurt = damp(this.hurt, clamp((1 - this.hp / this.maxHp - 0.45) * 2, 0, 1), 1.5, dt);
    // Out of a fight, wounds close.
    if (!this.foe && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + dt * (this.task?.kind === 'rest' ? 12 : 3));
    if (this.hp > this.maxHp * 0.6) this.hurtSay = false;

    world.think(this, dt);
    this.flyThings(dt, sim);
    if (this.surf) { if (this.surf.free) this.updateFreeSurf(dt, sim, world); else this.updateSurf(dt, sim, world); }
    else {
      if (this.foe) this.fight(dt, sim, world);
      this.runSwing(dt, sim);
      this.walk(dt, sim);
      this.move(dt, sim);
      if (this.jump) this.updateJump(dt, sim);
    }
    this.combat = damp(this.combat, this.foe ? 1 : 0, 4, dt);
    this.shieldUp = damp(this.shieldUp, this.shieldTarget, 8, dt);
    // Anything that moves the body moves the feet: turning on the spot, or being shouldered aside, is walked, never slid.
    const turned = Math.abs(wrapAngle(this.yaw - (this.prevYaw ?? this.yaw))) / Math.max(dt, 1e-4);
    this.prevYaw = this.yaw;
    const shoved = (this.nudged || 0) / Math.max(dt, 1e-4);
    this.nudged = 0;
    const free = !this.action && !this.sitting && !this.surf && !this.jump && this.air <= 0;
    this.turnStep = free && this.speed < 0.4 ? Math.max(turned > 0.9 ? clamp(turned * 0.35, 0.45, 0.9) : 0, shoved > 0.15 ? Math.min(1.4, shoved) : 0) : 0;
    // Head toward the player when near, as the town's knights do; square on while being talked to.
    const pdx = p.x - this.x, pdz = p.z - this.z, to = Math.atan2(pdx, pdz);
    // (Only close by: a street of strangers all turning to stare would be uncanny.)
    const off = wrapAngle(to - this.faceYaw), near = this.near < (this.talkUntil ? 9 : 4.5) && Math.abs(off) < 1.6 && !this.foe;
    this.lookYaw = damp(this.lookYaw || 0, near ? clamp(off, -1, 1) : 0, 5, dt);
    const eyeDrop = (p.y + 1.6) - (this.y + this.rig.height * 0.9);
    this.lookPitch = damp(this.lookPitch || 0, near ? clamp(Math.atan2(-eyeDrop, Math.max(this.near, 0.5)), -0.5, 0.5) : 0, 5, dt);
    // Far off and unseen there's no body to pose: just think, and walk the map.
    this.animT += dt;
    // (On screen near by, every tick; far off or out of sight less often, the pose carried along between: Sim.poseGap.)
    if (this.visible || this.foe) {
      // (Hands on a lute, or a body held for looking at, are posed every tick however far off: a strum is all small quick motion.)
      const gap = this.swing || this.surf || this.jump || this.luteW > 0.01 || this.point || this.tossing || this.bowW > 0.01 || this.spread > 0.01 || this.gesture === 'review' || !sim.poseGap ? 0 : sim.poseGap(this, this.lodSlot);
      if (this.animT >= gap - 1e-6) { this.animate(this.animT, sim); this.animT = 0; }
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
    // (One of your party lies where they fell till the fight's over: HeroWorld.stepCompany gets them up.)
    if (this.hired) return;
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
      sim.world.updateField(this.fieldAt.x, this.fieldAt.z, this.fieldAt.t, `h${this.id}`);
      sim.world.flow(flowDir, this.x, this.z, g.x, g.z, `h${this.id}`);
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
    // Your party's: stepping out of something (HeroWorld.companion set the goal), or fighting from a place it was given.
    if (this.dodgeT > 0) return;
    if (this.post) return this.fightFrom(sim, world, m, d, R, to);
    // A clear line to it, or not: nothing's shot, thrown, charged or leapt through a wall or round a corner.
    const line = this.lineTo(sim, m, d);
    // A special when one's ready and it suits: the one that suits best (chooseSkill, src/sim/heroskills.js), with a breath
    // between two of them so the ordinary blows are still most of a fight.
    if (this.gcd <= 0) {
      const pickS = chooseSkill(this, sim, world, m, d, R, line);
      if (pickS) { pickS.t = pickS.cd * rand(0.9, 1.3); this.gcd = pickS.gcd ?? rand(0.9, 1.7); this.used[pickS.key] = sim.time; this.skill(sim, pickS.key, m); return; }
      this.gcd = 0.25;
    }
    // What the class does between its blows: a rogue in and out, a ninja round and round (classRoutine). True if it has the body.
    if (classRoutine(this, sim, world, m, d, R, line, dt)) return;
    if (this.cls.ranged) {
      // Keep the ground between: step off from what comes close (between shots), and shoot from where it can't reach.
      const want = this.cls.want ?? this.cls.range * 0.7;
      // (With something of his own turning round him, a hammer or a boomerang or a note, he takes it in among them.)
      if (this.orbiting > 0 && d > R + 1.5) this.goal = { x: m.x - dx / d * (R + 1.2), z: m.z - dz / d * (R + 1.2), speed: 4.2, face: to, stop: 0.2 };
      else if (this.kiteT > 0) { /* still stepping */ }
      else if (this.shotCd > 0 && this.kite(sim, world, m)) { /* a step chosen */ }
      else if (d > this.cls.range) this.goal = { x: m.x - dx / d * want, z: m.z - dz / d * want, speed: 3.6, face: to };
      // (Something between them: on toward it, round whatever it is (walk() finds the way), till the line's clear.)
      else if (!line) this.goal = { x: m.x, z: m.z, speed: 3.6, stop: 2.5 };
      // (A boomerang knight is never still between throws: classRoutine gives him a step round at his distance.)
      else this.goal = this.sideGoal || this.elbowRoom(sim, world, to);
      if (d < 2.2 && !this.luteP) { if (this.shotCd <= 0) this.blow(sim, m); return; }
      if (line && d <= this.cls.range && this.shotCd <= 0 && this.kiteT <= 0) {
        if (this.style === 'bow') this.shoot(sim, m);
        else if (this.person.cls === 'bard') this.pluck(sim, m);
        // (One in each hand, thrown turn about.)
        else this.throwBoomerang(sim, m, (this.throwN = (this.throwN || 0) + 1) % 2);
      }
      return;
    }
    const reach = this.blows[0].reach + R - 0.2;
    if (d > reach) {
      // To its side of the foe, not onto the back of whoever's already there: with someone between him and it, or at his
      // elbow, he comes in a stride round from them, so three of them stand about it and not in a queue.
      let mine = Math.atan2(-dx, -dz);
      if (d < 7) for (const o of world.heroes) {
        if (o === this || o.foe !== m || o.dead || !o.active || o.cls.ranged) continue;
        const od = Math.hypot(o.x - m.x, o.z - m.z);
        if (od > d) continue;
        const off = wrapAngle(mine - Math.atan2(o.x - m.x, o.z - m.z));
        if (Math.abs(off) < 0.6) mine += (Math.abs(off) > 0.05 ? Math.sign(off) : (this.slot % 2 ? 1 : -1)) * (0.75 - Math.abs(off));
      }
      this.goal = { x: m.x + Math.sin(mine) * (reach - 0.4), z: m.z + Math.cos(mine) * (reach - 0.4), speed: d > 8 ? 4.4 : 3.2, face: to, stop: 0.2 };
    } else {
      // In reach. A rogue or a ninja, with someone else holding it, works round to its back between blows: a step at a
      // time round its flank, never across its front.
      this.goal = null;
      if (FLANKERS.has(this.person.cls) && m.yaw !== undefined && foeOf(m, sim) !== this) {
        const mine = Math.atan2(this.x - m.x, this.z - m.z), off = wrapAngle(m.yaw + Math.PI - mine);
        if (Math.abs(off) > 0.55) {
          const a = mine + clamp(off, -0.8, 0.8), r = Math.max(R + 0.7, reach - 0.3);
          this.goal = { x: m.x + Math.sin(a) * r, z: m.z + Math.cos(a) * r, speed: 3.4, face: to, stop: 0.2 };
        }
      }
      if (this.shotCd <= 0 && Math.abs(wrapAngle(to - this.yaw)) < 0.7) this.blow(sim, m);
    }
    // The lancer raises the tower board between blows.
    this.shieldTarget = this.style === 'lance' && d < 4 ? 1 : 0;
  }

  // Two who shoot, shoulder to shoulder: the one with the higher number takes a stride and a half off from the other.
  elbowRoom(sim, world, face) {
    for (const o of world.heroes) {
      if (o === this || o.dead || !o.active || o.slot > this.slot) continue;
      const dx = this.x - o.x, dz = this.z - o.z, d = Math.hypot(dx, dz);
      if (d > 1.5) continue;
      const a = d > 0.05 ? Math.atan2(dx, dz) : this.slot * 2.4;
      if (sim.world.clearance(this.x, this.z, Math.sin(a), Math.cos(a), 1.8, 0.45) < 1.5) continue;
      return { x: this.x + Math.sin(a) * 1.6, z: this.z + Math.cos(a) * 1.6, speed: 2.6, stop: 0.2, face };
    }
    return null;
  }

  // Is the way to its foe clear, for something shot or thrown: no wall, corner, pine or rise of the ground between, by a
  // hand's width either side (src/sim/sight.js: an arrow leaves the bow beside the eye). Looked at a few times a second,
  // and at once for a new foe.
  lineTo(sim, m, d) {
    if (m === this.lineFoe && sim.time < this.lineT) return this.line;
    this.lineFoe = m; this.lineT = sim.time + 0.25 + (this.slot % 5) * 0.02;
    if (d < 2.5) return (this.line = true);
    return (this.line = cleanLine(sim.world, this.x, this.y + 1.45, this.z, m.x, m.y + Math.min(1.1, (m.opts?.height ?? 1.8) * 0.6), m.z, 0.3));
  }

  // A step away, Velscour's ranger's way: only when it's needed (a pack at the elbow, something that bites in reach, or
  // hurt with anything near), 2.5 m to the best of ten spots: far from them all and not into a wall. Kept to for a moment.
  kite(sim, world, m) {
    const near = [];
    let close = 0, biter = false;
    for (const k of world.targets) {
      if (!fightable(k)) continue;
      const dd = Math.hypot(k.x - this.x, k.z - this.z) - radiusOf(k);
      if (dd > 14) continue;
      near.push(k);
      if (dd < 2.5) close++;
      if (dd < 3.1 && !(k instanceof Caster)) biter = true;
    }
    const hurt = this.hp < this.maxHp * 0.5 && near.some((k) => Math.hypot(k.x - this.x, k.z - this.z) < 5);
    if (!(close >= 3 || biter || hurt)) return false;
    let best = null, bs = -Infinity;
    const a0 = this.r() * 6.283;
    for (let i = 0; i < 10; i++) {
      const a = a0 + i * 0.6283, ux = Math.sin(a), uz = Math.cos(a);
      const room = sim.world.clearance(this.x, this.z, ux, uz, 2.5, 0.45);
      if (room < 1.4) continue;
      const x = this.x + ux * room, z = this.z + uz * room;
      if (floorAt(x, z) !== null) continue;
      let sc = 0.6 * room;
      for (const k of near) sc += Math.min(7, Math.hypot(k.x - x, k.z - z));
      if (sc > bs) { bs = sc; best = [x, z]; }
    }
    if (!best) return false;
    this.goal = { x: best[0], z: best[1], speed: 4.6, face: Math.atan2(m.x - this.x, m.z - this.z), stop: 0.25 };
    this.kiteT = 0.45;
    if (this.person.cls === 'archer' && this.r() < 0.1) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf('kite'));
    return true;
  }

  // An ordinary blow, landing at its marks in the clip on whatever's in reach in front. A lance or a spear thrusts down a
  // line and takes all of it (with a flash of the lance, as Velscour's lancers and dragoons do); a rogue's knife bites
  // deeper in a back.
  blow(sim, m) {
    const b = pick(this.blows);
    const speed = 1 + (this.buff?.dmg ? 0.1 : 0);
    const move = BLOW_MOVE[this.person.cls];
    if (move && this.r() < 0.06) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(move));
    const thrust = !!b.thrust;
    this.combo++;
    this.startSwing(b.clip, b.rate * speed, b.hit, (i) => {
      let dmg = b.dmg * this.power();
      if (this.person.cls === 'rogue') dmg *= this.backstab(sim, m);
      if (thrust) this.thrust(sim, b.reach, dmg, b.knock || 0);
      else {
        this.strikeAround(sim, b.reach, 1.0, dmg, b.knock || 0, 1);
        // (A blade in each hand: the arc each one cuts, in the class's colour. A kick leaves none.)
        if (!/kick/i.test(b.clip)) cutArc(this, sim, this.combo);
      }
    }, { lunge: 2.2, aimed: thrust, stab: thrust, from: b.from, end: b.end });
    this.shotCd = rand(0.25, 0.7);
  }

  // The lance's flash down the thrust, and everything on that line takes it.
  thrust(sim, reach, dmg, knock, big = 0.55) {
    const lancer = this.person.cls === 'lancer', elem = lancer ? ELEM.STORM : ELEM.SPIRIT;
    const ax = Math.sin(this.yaw), az = Math.cos(this.yaw), len = 0.9 * big;
    if (this.fxOk()) {
      // (Off the weapon's own point, a stride and a half on: not from the fist.)
      const g = this.handPos('r'), tip = (this.mainP?.reach ?? 1.4) * 0.9, h = [g[0] + ax * tip, g[1] - 0.05 * tip, g[2] + az * tip], wd = ((lancer ? 0.06 : 0.04) + 0.005 * Math.min(20, this.person.level)) * Math.min(1.3, 0.5 + big * 0.5);
      sim.casting.burst(FX.BEAM, elem, h[0], h[1], h[2], wd * 2.6, wd, 0.2, { ax, ay: 0, az, len, alpha: 0.35, extra: wd * 0.5 });
      sim.casting.burst(FX.BEAM, elem, h[0], h[1], h[2], wd, wd * 0.5, 0.2, { ax, ay: 0, az, len: len + 0.3, light: 6, lightR: 3, extra: wd * 0.3 });
      sim.casting.burst(FX.FLARE, lancer ? ELEM.LIGHT : elem, h[0] + ax * (len + 0.3), h[1], h[2] + az * (len + 0.3), 0.35, 0.08, 0.16);
    }
    const hit = sim.heroWorld.line(this, this.x, this.z, this.yaw, reach + 0.3, 0.45, dmg, { kind: 'puncture', poise: big > 2 ? 90 : big > 1 ? 55 : 30, knock });
    if (hit.length) sim.event(EV.WHOOSH, this.x, this.y + 1.2, this.z);
  }

  // From behind (within 60 degrees of its back), a blow counts nearly double.
  backstab(sim, m) {
    if (!m || Math.abs(wrapAngle(Math.atan2(this.x - m.x, this.z - m.z) - (m.yaw ?? 0))) < 2.1) return 1;
    if (this.fxOk()) sim.casting.burst(FX.FLARE, ELEM.DRAIN, m.x, m.y + 1.2, m.z, 0.3, 0.08, 0.14);
    if (this.r() < 0.12 && sim.time - this.lastSay > 6) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf('backstab'));
    return 1.8;
  }

  // Effects only where someone might see them: they share the frame's shapes with the player's spells.
  fxOk() { return this.visible && this.near < 80; }
  ahead(d, up = 1.2) { return [this.x + Math.sin(this.yaw) * d, this.y + up, this.z + Math.cos(this.yaw) * d]; }
  // Somewhere a body can stand near a point: out of walls and boxes.
  clearSpot(sim, x, z) { const o = [x, 0, z]; sim.world.resolve(o, 0.42, sim.world.height(x, z) + 0.2); return [o[0], o[2]]; }

  startSwing(clip, rate, hits, fn, o = {}) {
    if (!this.bank.clips[clip]) clip = 'Sword_Regular_A';
    this.play(clip, rate, o.mask || 'full', o.fade ?? 0.1);
    // (from: begun part-way in, past a clip's slow start. hold: [where, seconds], the pose kept there that long: an arm held
    // up for as long as what it called down is still coming.)
    if (o.from) this.actT = o.from * this.bank.clips[clip].dur;
    this.swing = { clip: this.bank.clips[clip], hits, fn, done: 0, end: o.end ?? 0.92, lunge: o.lunge || 0, still: o.still, root: o.root, after: o.after, tick: o.tick, cut: o.cut, aimed: o.aimed, stab: o.stab, hold: o.hold ? [o.hold[0], o.hold[1]] : null };
  }

  runSwing(dt, sim) {
    const s = this.swing;
    if (!s) return;
    if (this.action !== s.clip) { this.swing = null; this.charge = null; s.cut?.(); return; }
    s.tick?.(dt, this.actT / s.clip.dur);
    if (s.hold && s.hold[1] > 0 && this.actT >= s.hold[0] * s.clip.dur) { this.actT = s.hold[0] * s.clip.dur; s.hold[1] -= dt; }
    // A lance or a spear levelled at what it's for, whatever the clip's fist is doing with it: a thrust goes in point first
    // (aimed: true), a sweep carries the point round (aimed: a turn for each moment of the clip).
    if (s.aimed) { const a = typeof s.aimed === 'function' ? s.aimed(this.actT / s.clip.dur) : 0; this.aim = Array.isArray(a) ? a : [Math.sin(this.yaw + a), -0.05, Math.cos(this.yaw + a)]; }
    const f = this.actT / s.clip.dur;
    // (A stab: the shaft drawn back through the fist before it goes in and after, so the point clears what's before him
    // between thrusts and is seen to travel. writeProps slides it.)
    if (s.stab && s.hits.length) { const at = s.hits[0]; this.aimBack = 0.75 * (f < at ? 1 - ease(f / at) ** 2 : ease((f - at) / Math.max(0.05, s.end - at))); }
    while (s.done < s.hits.length && f >= s.hits[s.done]) { s.fn(s.done, sim); s.done++; }
    if (s.lunge && s.done < s.hits.length && f > s.hits[s.done] - 0.25) {
      const v = s.lunge * (this.foe && Math.hypot(this.foe.x - this.x, this.foe.z - this.z) < 1.4 ? 0 : 1);
      this.vx = Math.sin(this.yaw) * v; this.vz = Math.cos(this.yaw) * v;
    }
    // The lancer's charge: a short, fast run behind the board and the couched lance, through what's in the way. Each thing
    // on the line is run through once and thrown aside, and nothing touches him while he runs.
    if (this.charge && s.root) {
      const c = this.charge, v = c.left > 0 ? c.v : 0;
      c.left -= v * dt;
      this.vx = Math.sin(c.dir) * v; this.vz = Math.cos(c.dir) * v;
      if (v) {
        const rx = Math.cos(c.dir), rz = -Math.sin(c.dir);
        for (const k of sim.heroWorld.targets) {
          if (c.hitSet.has(k) || !fightable(k) || Math.hypot(k.x - this.x, k.z - this.z) > 1.3 + radiusOf(k)) continue;
          c.hitSet.add(k);
          this.hit(sim, k, (c.dmg ?? 16) * this.power(), c.kind || 'puncture', 60, 0, c.o || { stun: 0.6 });
          c.onHit?.(k);
          const side = Math.sign((k.x - this.x) * rx + (k.z - this.z) * rz) || 1;
          if (radiusOf(k) <= 1 && !c.noShove) { const fw = c.aside ? -3 : 8; sim.casting.shove(k, Math.sin(c.dir) * fw + rx * side * 11, Math.cos(c.dir) * fw + rz * side * 11); }
        }
        c.each?.(dt);
        if (((sim.tick + this.slot) & 3) === 0) sim.event(EV.STEP, this.x, this.y, this.z, 1, 1, this.id);
      }
    }
    // (A dash is over when its ground's covered, whatever's left of the clip.)
    if (this.charge && s.root && this.charge.left <= 0 && this.charge.quick) { const c = this.charge; this.swing = null; this.charge = null; this.stopAction(0.18); c.done?.(); s.after?.(sim); return; }
    if (f >= s.end) { const c = this.charge; this.swing = null; this.charge = null; this.stopAction(0.2); c?.done?.(); s.after?.(sim); }
  }

  // Everything fightable within reach in front of the hero takes the blow (up to `most` of them). Returns what it struck.
  strikeAround(sim, reach, arc, dmg, knock, most = 1, o = {}) {
    const struck = [];
    for (const m of sim.heroWorld.targets) {
      if (!fightable(m)) continue;
      const dx = m.x - this.x, dz = m.z - this.z, d = Math.hypot(dx, dz) - radiusOf(m);
      if (d > reach || Math.abs(m.y - this.y) > 2.5) continue;
      if (Math.abs(wrapAngle(Math.atan2(dx, dz) - this.yaw)) > arc) continue;
      if (this.hit(sim, m, dmg, o.kind || 'gash', o.poise ?? 25, knock, o)) struck.push(m);
      if (struck.length >= most) break;
    }
    if (struck.length) sim.event(EV.WHOOSH, this.x, this.y + 1.2, this.z);
    return struck;
  }

  // o: stun (seconds reeling), shove (m/s, out from fromX/fromZ or the hero), bleed (a cut that runs), dot (a tick of
  // burning or bleeding: no flinch, no sound), quiet (no sound).
  hit(sim, m, dmg, kind = 'gash', poise = 25, knock = 0, o = {}) {
    if (!fightable(m)) return false;
    // (Someone else already at it: kept, so the kill can be a rescue or a theft.)
    if (m.heroFoe && m.heroFoe !== this && sim.time - (m.heroFoeT ?? -1e9) < 4) { m.otherFoe = m.heroFoe; m.otherFoeT = sim.time; }
    m.heroFoe = this; m.heroFoeT = sim.time;
    // (Your tank holds what he hits; a twin's ward takes its share of anyone's blow.)
    if (this.hired && this.role === 'tank') { m.tauntBy = this; m.tauntT = sim.time + 5; }
    dmg *= m.ward ?? 1;
    if (m instanceof Knight) {
      // Velscour's guards hold: a party can hold one off and slip by, not cut it down for the player to find gone.
      m.hp = Math.max(m.maxHp * 0.4, m.hp - dmg * 0.5);
      if (!o.dot) m.onHit(sim, kind, this.x, this.z, poise, null);
      return true;
    }
    const w = sim.heroWorld, was = m.hp;
    m.hp -= dmg;
    if (m instanceof Zombie) m.seenHp = m.hp;
    if (!o.dot) m.onHit?.(sim, kind, this.x, this.z, poise, this);
    if (o.stun) w.stun(m, o.stun, this);
    else if (knock && m instanceof Zombie && !m.crawling) m.reel?.(sim, 0.4, this);
    if (o.shove && radiusOf(m) <= 1 && !(m instanceof Gravehart)) {
      const dx = m.x - (o.fromX ?? this.x), dz = m.z - (o.fromZ ?? this.z), L = Math.hypot(dx, dz) || 1;
      sim.casting.shove(m, dx / L * o.shove * 2.2, dz / L * o.shove * 2.2, o.up || 0);
    } else if (!o.dot && !o.quiet && poise >= 50 && radiusOf(m) <= 1 && !(m instanceof Gravehart)) {
      // (Anything heavy moves what it lands on: half a stride back from where it came, a stride for the heaviest.)
      const dx = m.x - (o.fromX ?? this.x), dz = m.z - (o.fromZ ?? this.z), L = Math.hypot(dx, dz) || 1, v = poise >= 90 ? 7 : 4;
      sim.casting.shove(m, dx / L * v, dz / L * v, 0);
    }
    if (o.bleed) w.bleed(this, m, dmg * 0.3);
    // Where it lands: a spark of the class's own colour at the point of the blow, on the tick of it. A heavy blow takes one
    // of the dead off its stride, and the heaviest, near you, holds the world a beat (as your own heavy blows do).
    if (!o.dot && !o.quiet) {
      if (this.fxOk()) {
        const big = Math.min(1, poise / 100), e = o.elem ?? this.hitElem, dx = this.x - m.x, dz = this.z - m.z, L = Math.hypot(dx, dz) || 1, R0 = Math.min(radiusOf(m), 0.6);
        const sx = m.x + dx / L * R0 * 0.6, sy = m.y + 1.15, sz = m.z + dz / L * R0 * 0.6;
        sim.casting.burst(FX.FLARE, e, sx, sy, sz, 0.08 + big * 0.1, 0.22 + big * 0.33, 0.1);
        sim.casting.burst(FX.GLYPH, e, sx, sy, sz, 0.1, 0.25 + big * 0.4, 0.12, { ay: 0, len: Math.random() * 6.28, extra: 11, alpha: 0.8 });
      }
      if (poise >= 50 && !o.stun && m instanceof Zombie && !m.crawling && sim.time - (m.heroReelT ?? -9) > 0.8) { m.heroReelT = sim.time; m.reel?.(sim, 0.28, this); }
      if (poise >= 90 && this.near < 22 && sim.time - (w.heldAt ?? -9) > 1.5) { w.heldAt = sim.time; sim.hitStop?.(0.055); }
    }
    // The blow heard and seen where it lands (main.js, EV.BITE): steel on bone, or on a shell.
    if (!o.dot && !o.quiet && Math.hypot(sim.player.x - m.x, sim.player.z - m.z) < 60) sim.event(EV.BITE, m.x, m.y + 1.1, m.z, Math.min(1, dmg / 20), m instanceof Crab ? 0 : 1);
    if (was > 0 && m.hp <= 0) w.onKill(this, m);
    return true;
  }

  // ---- specials ----

  skill(sim, key, m) {
    const w = sim.heroWorld;
    const say = () => { if (this.r() < 0.35) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(key)); };
    // (Most of them are in src/sim/heroskills.js; the few here are the ones whose look is drawn by HeroWorld.)
    if (castSkill(this, sim, key, m)) return;
    switch (key) {
      case 'blessed_hammers':
        // Three blessed hammers spiral out round him and keep turning as he fights on: Velscour's paladin's main attack.
        this.startSwing('Spell_Simple_Shoot', 1.0, [0.4], () => {
          const rk = rank(this);
          this.hammersUp = true;
          w.zones.push({ kind: 'blessed', owner: this, t: 0, life: 3.2 + 0.5 * rk, n: 3 + Math.floor(rk / 2), a0: Math.random() * 6.28, hitT: new Map(), end: () => { this.hammersUp = false; } });
          if (this.fxOk()) { sim.casting.burst(FX.RING, ELEM.LIGHT, this.x, this.y + 0.06, this.z, 0.3, 1.8, 0.3, { light: 10, lightR: 5 }); sim.event(EV.HERO_FX, 4, this.x, this.y + 1.3, this.z, 7, 0.5); }
        }, { mask: 'upper' });
        break;
      case 'charge': {
        // Head down behind the board, lance couched: a short, fast run through whatever's in the way.
        const to = Math.atan2(m.x - this.x, m.z - this.z);
        this.yaw = this.faceYaw = to;
        this.shieldTarget = 1;
        const len = Math.min(8.5, Math.hypot(m.x - this.x, m.z - this.z) + 1.4), T = len / 15;
        this.startSwing('Shield_Dash', 1.1 / (T + 0.3), [], () => {}, { root: true });
        this.charge = { dir: to, left: len, v: 15, hitSet: new Set(), quick: true, lancer: true, done: () => arrive(this, sim, ELEM.STORM) };
        this.aim = [Math.sin(to), -0.03, Math.cos(to)];      // (the lance couched, level, the way he runs)
        this.iframesT = T + 0.05;
        break;
      }
      case 'shield_wall':
        // Behind the board for a few seconds, and little gets through it from any side.
        this.shieldTarget = 1;
        this.startSwing('Shield_OneShot', 1.3, [0.4], () => {
          this.guardT = 4;
          // Boards of light stood in a row before him for as long as it holds, a line on the ground, and everything near called onto him.
          const yaw = this.yaw;
          w.zones.push({ kind: 'fx', owner: this, t: 0, life: 4, draw: (c, z) => {
            const k = Math.min(1, z.t * 5, (4 - z.t) * 3), fx = Math.sin(yaw), fz = Math.cos(yaw);
            for (let i = -2; i <= 2; i++) { const a = yaw + i * 0.56, r = 1.5; c.fx(FX.KITE, i % 2 ? ELEM.FROST : ELEM.STORM, this.x + Math.sin(a) * r, this.y + 1.0, this.z + Math.cos(a) * r, 0.7 * Math.min(1, z.t * 6 - Math.abs(i) * 0.3 + 0.6), Math.sin(a), 0, Math.cos(a), 0, 0.85 * k, i === 0 ? 6 * k : 0, 5, 0.3, i); }
            c.fx(FX.RING, ELEM.STORM, this.x + fx * 0.3, this.y + 0.06, this.z + fz * 0.3, 1.5, 0, 1, 0, 0, 0.6 * k);
          } });
          for (const k of w.targets) if (fightable(k) && Math.hypot(k.x - this.x, k.z - this.z) < 8) { k.tauntBy = this; k.tauntT = sim.time + 4; k.heroFoe = this; k.heroFoeT = sim.time; }
          if (this.fxOk()) { sim.casting.burst(FX.RING, ELEM.STORM, this.x, this.y + 0.06, this.z, 1, 8, 0.5, { alpha: 0.7 }); sim.event(EV.HERO_FX, 3, this.x + Math.sin(yaw), this.y + 1.1, this.z + Math.cos(yaw), 30); }
        }, { still: true, end: 0.9 });
        break;
      case 'shield_bash':
        this.startSwing('L_ShieldJab', 1.7, [0.55], () => {
          this.strikeAround(sim, 1.8, 0.6, 8 * this.power(), 0, 3, { kind: 'bash', poise: 70, stun: 1.1, shove: 6 });
          if (this.fxOk()) { const f = this.ahead(1.0); sim.casting.burst(FX.KITE, ELEM.STORM, f[0], f[1], f[2], 0.5, 1.1, 0.2, { ax: Math.sin(this.yaw), ay: 0, az: Math.cos(this.yaw), extra: 0.3 }); sim.casting.burst(FX.FLARE, ELEM.STORM, f[0], f[1], f[2], 0.3, 0.9, 0.14); sim.event(EV.HERO_FX, 3, f[0], f[1], f[2], 24); }
        }, { lunge: 2 });
        break;
      case 'jump':
        this.leap(sim, m, LEAPS[key]);
        break;
      default: return;
    }
    say();
  }

  // (Your party keeps pace with you, level for level: src/items/levels.js gives you 7% a level.)
  power() { return (1 + this.person.level * (this.hired ? 0.065 : 0.035)) * (this.buff?.dmg || 1); }

  // The ninja's finisher: the kick, then seven strokes of gold across a circle round the foe, point to point in a
  // seven-pointed star, and everything inside it reels.
  sevenSided(sim, m) {
    if (this.dead || !fightable(m)) return;
    const w = sim.heroWorld;
    this.startSwing('LP_front_kick_02', 1.2, [0.45], () => {
      const cx = m.x, cz = m.z, cy = m.y + 0.7, R = 1.4;
      if (this.fxOk()) {
        for (let k = 0; k < 7; k++) {
          w.later(k * 0.045, () => {
            const a0 = k * 0.8976, a1 = ((k + 3) % 7) * 0.8976;
            const x0 = cx + Math.sin(a0) * R, z0 = cz + Math.cos(a0) * R, x1 = cx + Math.sin(a1) * R, z1 = cz + Math.cos(a1) * R;
            const L = Math.hypot(x1 - x0, z1 - z0);
            sim.casting.burst(FX.BEAM, ELEM.LIGHT, x0, cy, z0, 0.05, 0.02, 0.14, { ax: (x1 - x0) / L, ay: 0, az: (z1 - z0) / L, len: L, light: 6, lightR: 4, extra: 0.02 });
          });
        }
      }
      w.later(0.32, () => {
        if (this.dead) return;
        w.blast(this, cx, cz, m.y, 2.8, 12 * this.power(), { kind: 'gash', poise: 60, stun: 1.1, shove: 7 });
        sim.event(EV.WHOOSH, cx, cy, cz);
      });
      if (this.r() < 0.3) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf('ninja_flurry'));
    });
  }

  // Up and down on it: the dragoon's jump, again and again, and the ninja's flying kick. Untouchable in the air.
  // L (LEAPS, and the leaps of src/sim/heroskills.js): T seconds in the air, apex metres up, r the landing's reach, and
  // what the body does on the way: flip (turns forward; negative, backward), roll (sideways), spin (about), back (facing
  // where it came from: a backflip away), lance (the spear in the fist is aimed down the dive and driven into the ground),
  // draw (c, hero, jump) each tick it's in the air, land (hero, sim, jump, x, z) for a landing of its own.
  // o.to: a place to land instead of the foe. o.after: once it's up again.
  leap(sim, m, L, o = {}) {
    this.jump = { t: 0, x0: this.x, z0: this.z, x1: o.to ? o.to[0] : m.x, z1: o.to ? o.to[1] : m.z, phase: 0, foe: o.to ? null : m, aimAt: m, L, o, u: 0, head: this.yaw };
    this.play(L.start || 'NinjaJump_Start', L.startRate || 2, 'full', 0.06);
  }

  // Off the ground for a move that isn't a leap at a foe: a backflip away, a vault. Same body, same rules.
  endJump() {
    this.jump = null; this.bodyFlip = 0; this.bodyRoll = 0; this.aim = null; this.air = 0;
  }

  // A bard's note: plucked, and off after the foe, bending toward it as it flies.
  pluck(sim, m) {
    // (With a lute: a few bars on it, and the note comes off the strings. src/sim/heroskills.js.)
    if (this.luteP) { pluckNote(this, sim, m); this.shotCd = rand(0.8, 1.3); return; }
    this.startSwing('Spell_Simple_Shoot', 0.9, [0.5], () => {
      const h = this.handPos('r'), a = Math.atan2(m.x - h[0], m.z - h[2]);
      sim.heroWorld.shots.push({ kind: 'note', owner: this, x: h[0], y: h[1], z: h[2], vx: Math.sin(a) * 11, vy: 0, vz: Math.cos(a) * 11, t: 0, dmg: 7 * this.power(), foe: m, elem: ELEM.ARCANE });
      sim.event(EV.WHOOSH, h[0], h[1], h[2]);
    }, { mask: 'upper' });
    this.shotCd = rand(0.8, 1.3);
  }

  // An arrow: drawn, the string lit in the archer's colour, and loosed.
  shoot(sim, m) {
    this.draw = 0;
    this.startSwing('Spell_Simple_Shoot', 0.7, [0.6], () => this.loose(sim, m, 0, 10 * this.power()), { still: true, mask: 'upper' });
    this.shotCd = rand(0.7, 1.4);
  }

  loose(sim, m, spread, dmg, hush = false) {
    const h = this.handPos('l');
    const ty = m.y + (m instanceof Gravehart ? 1.8 : 1.1);
    const a = Math.atan2(m.x - h[0], m.z - h[2]) + spread, d = Math.hypot(m.x - h[0], m.z - h[2]);
    const v = 42, t = d / v;
    sim.heroWorld.shots.push({ kind: 'arrow', owner: this, x: h[0], y: h[1], z: h[2], vx: Math.sin(a) * v, vy: (ty - h[1]) / t + 2.5 * t, vz: Math.cos(a) * v, t: 0, dmg, elem: this.stringElem });
    if (!hush) sim.event(EV.WHOOSH, h[0], h[1], h[2]);
    this.draw = 0;
    this.bowUntil = sim.time + 0.32;      // (the bow arm stays up behind the arrow a moment)
  }

  // One of his two, thrown: out round a curve and back to the hand it left. The right goes with the whole body behind it;
  // the left with the arm alone and the shoulders turned into it (toss), so he can let one go from each hand turn about.
  // wide: how far out to its side the curve swings. o.cross: the two cross at the far end and come home on each other's side.
  throwBoomerang(sim, m, hand, wide = 1, o = {}) {
    if (this.flight && this.flight.length >= 2) return;
    if (this.flight?.some((f) => f.hand === hand)) hand = hand ? 0 : 1;
    const letGo = () => {
      if (this.flight?.some((f) => f.hand === hand) || !fightable(m)) return;
      const h = this.handPos(hand ? 'l' : 'r');
      const out = o.out ?? Math.min(9, Math.hypot(m.x - this.x, m.z - this.z) + 2.5);
      const dir = Math.atan2(m.x - this.x, m.z - this.z);
      (this.flight ||= []).push({ hand, t: 0, dur: 1.5, x0: h[0], y0: h[1], z0: h[2], dir, out, side: (hand ? -1 : 1) * wide, cross: o.cross, hitSet: new Set(), dmg: (o.dmg ?? 9) * this.power(), x: h[0], y: h[1], z: h[2], glow: ELEM.LIGHT });
      sim.event(EV.WHOOSH, h[0], h[1], h[2]);
    };
    // (The clip lets go a quarter of the way in, as the hand comes past the shoulder; the rest of it is the arm coming down.)
    if (hand) this.toss('l', 0.46, letGo);
    else this.startSwing('OverhandThrow', 1.25, [0.23], letGo, { end: 0.5, mask: this.speed > 0.6 ? 'upper' : 'full' });
    this.shotCd = rand(0.9, 1.5);
  }

  flyThings(dt, sim) {
    if (!this.flight) return;
    for (const f of this.flight) {
      f.t += dt;
      // Out along a curve and back to the hand that threw it, cutting what it passes both ways.
      const u = Math.min(1, f.t / f.dur), a = u * Math.PI * 2;
      if (u >= 0.5 && !f.back) { f.back = true; f.hitSet.clear(); }
      const px = f.x, pz = f.z;
      const fwd = Math.sin(a * 0.5) * f.out, side = f.cross ? Math.sin(a) * f.out * 0.3 * f.side : (1 - Math.cos(a)) * 0.5 * f.out * 0.35 * f.side;
      const h = this.handPos(f.hand ? 'l' : 'r');
      const bx = f.x0 + (h[0] - f.x0) * u, bz = f.z0 + (h[2] - f.z0) * u;
      f.x = bx + Math.sin(f.dir) * fwd + Math.cos(f.dir) * side;
      f.z = bz + Math.cos(f.dir) * fwd - Math.sin(f.dir) * side;
      f.y = f.y0 + (h[1] - f.y0) * u + Math.sin(u * Math.PI) * 0.4;
      f.spin = (f.spin || 0) + dt * 20;
      const tx = f.x - px, tz = f.z - pz, tl = Math.hypot(tx, tz);
      if (tl > 1e-4) { f.tx = tx / tl; f.tz = tz / tl; }
      for (const m of sim.heroWorld.targets) {
        if (!fightable(m) || f.hitSet.has(m) || Math.hypot(m.x - f.x, m.z - f.z) > radiusOf(m) + 0.6 || Math.abs(m.y + 1 - f.y) > 1.6) continue;
        f.hitSet.add(m); this.hit(sim, m, f.dmg, 'gash', 20, 0, { elem: ELEM.LIGHT });
      }
    }
    // Caught: a flash at the hand.
    for (const f of this.flight) {
      if (f.t < f.dur) continue;
      const h = this.handPos(f.hand ? 'l' : 'r');
      if (this.fxOk()) sim.casting.burst(FX.FLARE, ELEM.LIGHT, h[0], h[1], h[2], 0.08, 0.4, 0.2, { light: 4, lightR: 2 });
      if (this.foe && this.r() < 0.06 && sim.time - this.lastSay > 8) this.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf('catch'));
    }
    this.flight = this.flight.filter((f) => f.t < f.dur);
    if (!this.flight.length) this.flight = null;
  }

  updateJump(dt, sim) {
    const j = this.jump, L = j.L || LEAPS.jump, w = sim.heroWorld;
    j.t += dt;
    if (j.phase === 0 && j.t > (L.crouch ?? 0.15)) { j.phase = 1; j.t = 0; this.play(L.air, L.airRate || 1, 'full', 0.08); sim.event(EV.WHOOSH, this.x, this.y + 1, this.z); }
    if (j.phase === 1) {
      const u = Math.min(1, j.t / L.T);
      if (j.foe && fightable(j.foe)) { j.x1 = j.foe.x; j.z1 = j.foe.z; }
      const head = Math.abs(j.x1 - j.x0) + Math.abs(j.z1 - j.z0) < 0.05 ? j.head : Math.atan2(j.x1 - j.x0, j.z1 - j.z0), short = j.o.to ? 0 : L.short ?? 1.2;
      const ex = j.x1 - Math.sin(head) * short, ez = j.z1 - Math.cos(head) * short;
      // (Out of the crouch fast and hanging at the top, as a leap is: not a steady slide along its arc.)
      // A plain arc; or (snap) up fast, a moment hung at the top, and down faster than it rose, most of the ground covered
      // on the way up: a leap that means to land on something.
      const along = L.snap ? (u < 0.6 ? 0.82 * (1 - (1 - u / 0.6) ** 1.6) : 0.82 + 0.18 * (u - 0.6) / 0.4) : L.hang ? u * u * (3 - 2 * u) * 0.35 + u * 0.65 : u;
      this.x = j.x0 + (ex - j.x0) * along; this.z = j.z0 + (ez - j.z0) * along;
      this.air = (L.snap ? (u < 0.42 ? 1 - (1 - u / 0.42) ** 2 : u < 0.6 ? 1 : 1 - ((u - 0.6) / 0.4) ** 2.4) : Math.sin(u * Math.PI)) * L.apex;
      this.y = sim.world.height(this.x, this.z) + this.air;
      this.vx = 0; this.vz = 0;
      this.iframesT = 0.1;
      j.u = u; j.head = head;
      // The body over itself: tucked through the middle of the leap, open at both ends, so it lands on its feet.
      // (Turned over by the top of it, so the fall is straight and the feet are under him.)
      const tu = L.snap ? Math.min(1, u / 0.62) : u, turn = tu * tu * (3 - 2 * tu);
      this.bodyFlip = (L.flip || 0) * 6.2832 * turn;
      this.bodyRoll = (L.roll || 0) * 6.2832 * turn;
      this.yaw = this.faceYaw = wrapAngle((L.back ? head + Math.PI : head) + (L.spin || 0) * 6.2832 * turn);
      // The spear in the fist, up on the rise and down on the dive.
      if (L.lance) { const up = (L.snap ? (u < 0.45 ? 0.9 - u * 1.4 : 0.27 - (u - 0.45) * 3.2) : Math.cos(u * Math.PI) * 0.9 - 0.25 * u), n = Math.hypot(1, up); this.aim = [Math.sin(head) / n, up / n, Math.cos(head) / n]; }
      L.tick?.(this, sim, j, dt);
      if (u >= 1) {
        j.phase = 2; j.t = 0; this.air = 0; this.y = sim.world.height(this.x, this.z);
        this.bodyFlip = 0; this.bodyRoll = 0; this.yaw = this.faceYaw = L.back ? wrapAngle(head + Math.PI) : head;
        this.play(L.landClip || 'NinjaJump_Land', L.landRate || 1.6, 'full', 0.05);
        const fx = this.x + Math.sin(head) * 0.9, fz = this.z + Math.cos(head) * 0.9;
        if (L.land) L.land(this, sim, j, fx, fz);
        else {
          if (this.fxOk()) {
            sim.casting.burst(FX.FLARE, L.elem, fx, this.y + 0.25, fz, 0.3, L.r * 0.7, 0.2, { light: 10, lightR: 6 });
            sim.casting.burst(FX.RING, L.elem, fx, this.y + 0.05, fz, 0.4, L.r + 0.5, 0.4);
          }
          sim.event(EV.GROUND, this.x, this.y, this.z);
          w.blast(this, fx, fz, this.y, L.r, L.dmg * this.power(), { kind: L.lance ? 'puncture' : 'bash', poise: 70, shove: 5, ...(L.o || {}) });
        }
        // The dragoon's own spear goes into the ground where he lands, stands there a moment in its light, and is back in his fist.
        if (L.lance) {
          // (At the slant it came down on, its point a stride and a half before him and his fist still on the haft.)
          const reach = this.mainP?.reach ?? 1.4, d = norm([Math.sin(head) * 0.85, -1, Math.cos(head) * 0.85]);
          const px = this.x + Math.sin(head) * 1.3, pz = this.z + Math.cos(head) * 1.3;
          const gx = px - d[0] * reach * 0.76, gy = this.y - d[1] * reach * 0.76, gz = pz - d[2] * reach * 0.76;
          const x = norm(cross(d, [0, 1, 0])), z = cross(x, d);
          this.free[0] = new Float32Array([x[0], x[1], x[2], 0, d[0], d[1], d[2], 0, z[0], z[1], z[2], 0, gx, gy, gz, 1]);
          this.aim = null;
          this.gripAt = [gx, gy, gz];
          w.zones.push({ kind: 'planted', owner: this, x: px, z: pz, y: this.y, dir: head, t: 0, life: 0.5, elem: L.elem, len: reach, at: [gx, gy, gz], d, end: () => { this.free[0] = null; this.gripAt = null; } });
        }
        this.leaps++;
      }
    } else if (j.phase === 2 && j.t > (L.rest ?? 0.4)) { const after = j.o.after; this.endJump(); this.stopAction(0.2); after?.(); }
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
    this.draw = damp(this.draw, drawing ? 1 : 0, drawing ? 8 : 14, 1 / 120);
    this.nock = null;
    if (this.style === 'bow') {
      // The arms' own part in it (poseBow): the bow arm up while it's drawn and a moment after, the string hand back as far
      // as it's drawn, and how high it's aimed (at the foe's chest; or at the sky, for arrows meant to come down on them).
      const up = (drawing || sim.time < this.bowUntil) && !this.dead, m = this.foe;
      this.bowW = damp(this.bowW, up ? 1 : 0, up ? 16 : 7, 1 / 120);
      this.pull = damp(this.pull, drawing ? 1 : 0, drawing ? 7 : 5, 1 / 120);
      const want = this.bowLoftT > 0 ? 1.05 : m && fightable(m) ? clamp(Math.atan2(m.y + 1.1 - (this.y + 1.4), Math.hypot(m.x - this.x, m.z - this.z) || 1), -0.5, 0.6) : 0;
      this.bowPitch = damp(this.bowPitch, want, 10, 1 / 120);
    }
    // (At rest the string's still there, straight between the tips and only faintly lit: kit.py cut the mesh's away.)
    if (!this.visible || !this.bowTips || this.near > 40) return;
    const [top, bot] = this.bowTips, k = Math.max(0.3, this.draw);
    if (this.draw < 0.05) { sim.heroWorld.cord(top, bot, this.stringElem, k); return; }
    const nock = this.handPos('r');
    const mid = [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2];
    // (The arrow on the string: from the fingers that hold it to a hand's width past the bow.)
    if (drawing && this.pull > 0.25) { const g = this.handPos('l'), dx = g[0] - nock[0], dy = g[1] - nock[1], dz = g[2] - nock[2], L = Math.hypot(dx, dy, dz) || 1; this.nock = [nock[0], nock[1], nock[2], dx / L, dy / L, dz / L, L + 0.16]; }
    const at = [mid[0] + (nock[0] - mid[0]) * this.draw, mid[1] + (nock[1] - mid[1]) * this.draw, mid[2] + (nock[2] - mid[2]) * this.draw];
    sim.heroWorld.cord(top, at, this.stringElem, k);
    sim.heroWorld.cord(at, bot, this.stringElem, k);
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
    if (s.d <= 20 || townDist(x, z) < -10) world.surfDone(this);
    this.animT += dt;
    if (this.visible) { this.animate(this.animT, sim); this.animT = 0; }
  }

  // ---- your party's ways of fighting ----------------------------------------------------------------------------------

  // From a place the party was given (HeroWorld.stance): the healer's distance, a dragon's flank, out of a whirlwind's
  // reach. Walk there; strike or shoot whatever's in reach from it.
  fightFrom(sim, world, m, d, R, to) {
    const [px, pz] = this.post, dp = Math.hypot(px - this.x, pz - this.z);
    this.goal = dp > 0.7 ? { x: px, z: pz, speed: dp > 5 ? 7 : 3.2, stop: 0.35, face: to } : null;
    this.shieldTarget = this.style === 'lance' && d < 4 ? 1 : 0;
    const line = this.lineTo(sim, m, d);
    // (Any move that doesn't take him off the place he was given.)
    if (this.gcd <= 0) {
      const pickS = chooseSkill(this, sim, world, m, d, R, line, null, true);
      if (pickS) { pickS.t = pickS.cd * rand(0.9, 1.3); this.gcd = pickS.gcd ?? rand(1.1, 2); this.used[pickS.key] = sim.time; this.skill(sim, pickS.key, m); return; }
      this.gcd = 0.3;
    }
    if (this.shotCd > 0) return;
    if (this.role === 'heal') return;
    if (this.cls.ranged) {
      if (line && d <= this.cls.range + 2) {
        if (this.style === 'bow') this.shoot(sim, m);
        else if (this.person.cls === 'bard') this.pluck(sim, m);
        else this.throwBoomerang(sim, m, (this.throwN = (this.throwN || 0) + 1) % 2);
      }
      return;
    }
    if (d - R < this.blows[0].reach - 0.1 && Math.abs(wrapAngle(to - this.yaw)) < 0.8) this.blow(sim, m);
  }

  // On the board beside you, wherever you ride yours: a place behind you and to one side, kept at your pace, and off it
  // when you step off.
  updateFreeSurf(dt, sim, world) {
    const s = this.surf, p = sim.player;
    const pv = Math.hypot(p.vx || 0, p.vz || 0);
    let ux = pv > 0.8 ? p.vx / pv : Math.sin(p.yaw), uz = pv > 0.8 ? p.vz / pv : Math.cos(p.yaw);
    const back = 3.2 + Math.floor(s.i / 2) * 2.6, side = (s.i % 2 ? 1 : -1) * (1.6 + 0.3 * Math.floor(s.i / 2));
    const tx = p.x - ux * back + uz * side, tz = p.z - uz * back - ux * side;
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d > 45) { this.x = this.lastX = tx; this.z = this.lastZ = tz; }
    s.v = damp(s.v, clamp(pv + d * 1.4 - 0.5, 0, 30), 4, dt);
    if (d > 0.3) { const k = clamp(d / 6, 0.15, 0.9); ux = ux * (1 - k) + dx / d * k; uz = uz * (1 - k) + dz / d * k; const L = Math.hypot(ux, uz) || 1; ux /= L; uz /= L; }
    const out = surfPos;
    out[0] = this.x + ux * s.v * dt; out[1] = this.y; out[2] = this.z + uz * s.v * dt;
    sim.world.resolve(out, 0.4, this.y + 0.2);
    this.vx = (out[0] - this.x) / dt; this.vz = (out[2] - this.z) / dt;
    this.x = out[0]; this.z = out[2];
    this.y = sim.world.height(this.x, this.z) + 0.26;
    this.speed = 0;
    s.travel = Math.atan2(ux, uz);
    this.yaw = this.faceYaw = wrapAngle(s.travel + Math.PI / 2 * s.foot);
    if (this.action?.name !== 'Crouch_Idle_Loop') this.play('Crouch_Idle_Loop', 1, 'full', 0.25);
    // Off it a moment after you are.
    s.off = p.surfing ? 0 : (s.off || 0) + dt;
    if (s.off > 0.3 || p.dead) {
      this.surf = null; this.stopAction(0.2);
      this.y = sim.world.height(this.x, this.z);
      sim.event(EV.LAND, this.x, this.y, this.z, 0.4);
    }
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
        const c = Math.cos(f.spin || 0), s = Math.sin(f.spin || 0);   // (Thrown this tick, it hasn't turned yet.)
        // Spinning about its own face, and banked about the way it's flying: nearly on edge as it leaves the hand, laid
        // nearly flat by the far end of its loop, a little tipped on the way home (as Velscour's rang flies).
        const u = Math.min(1, f.t / f.dur), k = Math.min(1, u / 0.5), e = k * k * (3 - 2 * k);
        const bank = (u < 0.5 ? 1.15 - 0.9 * e : 0.22) * f.side;
        const tx = f.tx ?? Math.sin(f.dir), tz = f.tz ?? Math.cos(f.dir);
        const a = bankAbout([c, 0, -s], tx, tz, bank), b = bankAbout([s, 0, c], tx, tz, bank), n = bankAbout([0, -1, 0], tx, tz, bank);
        out.set([a[0], a[1], a[2], 0, b[0], b[1], b[2], 0, n[0], n[1], n[2], 0, f.x, f.y, f.z, 1], o);
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
    // The main hand's weapon pointed where a move wants it (a dragoon's spear down his dive), still in the fist.
    if (this.aim && out[off + 15] !== 0) {
      const y = norm(this.aim), x = norm(cross(y, Math.abs(y[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0])), z = cross(x, y);
      out.set([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0], off);
      if (this.aimBack) { out[off + 12] -= y[0] * this.aimBack; out[off + 13] -= y[1] * this.aimBack; out[off + 14] -= y[2] * this.aimBack; }
    }
    // A bard's lute: across the back, or in the hands (afterPose put it there), or on its way round his right side between.
    // The sword is at the left hip while the hands are on the lute.
    if (this.luteP) {
      const lo = off + 48, w = this.luteW, e = w * w * (3 - 2 * w), j = J.spine3;
      if (this.dead && this.deadT > 1.5) zero(lo);
      else {
        quatMul(propQ, 0, wq, j * 4, this.luteBackQ, 0);
        quatRotate(propT, 0, wq, j * 4, this.luteBackT, 0);
        propT[0] += wt[j * 3]; propT[1] += wt[j * 3 + 1]; propT[2] += wt[j * 3 + 2];
        if (e > 0.001) {
          if (!this.luteLive) {
            quatMul(this.luteQ, 0, wq, j * 4, this.lutePlayQ, 0);
            quatRotate(this.luteT, 0, wq, j * 4, this.lutePlayT, 0);
            this.luteT[0] += wt[j * 3]; this.luteT[1] += wt[j * 3 + 1]; this.luteT[2] += wt[j * 3 + 2];
          }
          quatNlerp(propQ, 0, propQ, 0, this.luteQ, 0, e);
          const out2 = Math.sin(e * Math.PI) * 0.42, rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
          propT[0] += (this.luteT[0] - propT[0]) * e + rx * out2; propT[1] += (this.luteT[1] - propT[1]) * e; propT[2] += (this.luteT[2] - propT[2]) * e + rz * out2;
        }
        mat4FromQT(propM, propQ, 0, propT, 0);
        out.set(propM, lo);
      }
      if (e > 0.001 && out[off + 15] !== 0 && !this.free[0]) {
        const pj = J.pelvis;
        const q0 = matToQuat([out[off], out[off + 1], out[off + 2]], [out[off + 4], out[off + 5], out[off + 6]], [out[off + 8], out[off + 9], out[off + 10]]);
        quatMul(propQ, 0, wq, pj * 4, this.sheathQ, 0);
        quatRotate(propT, 0, wq, pj * 4, this.sheathT, 0);
        propT[0] += wt[pj * 3]; propT[1] += wt[pj * 3 + 1]; propT[2] += wt[pj * 3 + 2];
        quatNlerp(propQ, 0, q0, 0, propQ, 0, e);
        for (let i = 0; i < 3; i++) propT[i] = out[off + 12 + i] + (propT[i] - out[off + 12 + i]) * e;
        mat4FromQT(propM, propQ, 0, propT, 0);
        out.set(propM, off);
      }
    }
    // Out of its hand altogether: a board thrown, a spear standing in the ground.
    for (let i = 0; i < 4; i++) if (this.free[i]) out.set(this.free[i], off + i * 16);
  }

  // ---- what no clip has in it ---------------------------------------------------------------------------------------

  // After the pose is made and before the ground and the hands' things are worked out from it (Knight.animate).
  afterPose(dt, sim) {
    this.luteLive = false;
    if (!this.dead) {
      // (Some clips end a blow folded face down, or wind it up with the off arm straight out: a fighter does neither.)
      if ((this.swing || this.charge || this.tossing) && !this.jump && !this.surf) this.capPitch(this.charge ? 0.6 : 0.72);
      if (this.swing && this.swing.clip.name === 'Sword_Attack') this.guardArm();
      if (this.luteP && this.luteW > 0.01) this.poseLute();
      if (this.bowW > 0.01) this.poseBow();
      if (this.spread > 0.01) this.poseSpread();
      if (this.tossing) this.poseToss();
      if (this.point) this.posePoint();
      if (this.gripAt) this.reachTo('r', this.gripAt[0], this.gripAt[1], this.gripAt[2], [-Math.cos(this.yaw) * 0.4, -1, Math.sin(this.yaw) * 0.4], 1);
    }
    if (this.bodyFlip || this.bodyRoll) this.tumble();
  }

  // Folded further forward than `cap` (from upright, hips to chest), the body's straightened from the waist to that.
  capPitch(cap) {
    const { wt } = this.pose, p = this.J.pelvis * 3, c3 = this.J.spine3 * 3, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const pitch = Math.atan2((wt[c3] - wt[p]) * s + (wt[c3 + 2] - wt[p + 2]) * c, wt[c3 + 1] - wt[p + 1]);
    if (pitch <= cap) return;
    const sj = this.upperBody[0] * 3;
    quatAxisAngle(ikQ, 0, c, 0, -s, cap - pitch);
    this.rigid(this.upperBody, ikQ, wt[sj], wt[sj + 1], wt[sj + 2]);
  }

  // The off hand kept in at the chest through a blow whose clip throws it out wide.
  guardArm() {
    const { wt } = this.pose, c3 = this.J.spine3 * 3, s = Math.sin(this.yaw), c = Math.cos(this.yaw), k = this.rig.height / 1.8;
    const w = 0.85 * ease(Math.min(this.actT / 0.12, 1));
    this.reachTo('l', wt[c3] + (s * 0.3 + c * 0.14) * k, wt[c3 + 1] - 0.14 * k, wt[c3 + 2] + (c * 0.3 - s * 0.14) * k, [c * 0.7, -0.7, -s * 0.7], w);
  }

  // A shoulder to its wrist, as the arm is now.
  armLen(side) {
    const { wt } = this.pose, A = this.arms[side], U = A.u * 3, F = A.f * 3, H = A.h * 3;
    return Math.hypot(wt[F] - wt[U], wt[F + 1] - wt[U + 1], wt[F + 2] - wt[U + 2]) + Math.hypot(wt[H] - wt[F], wt[H + 1] - wt[F + 1], wt[H + 2] - wt[F + 2]);
  }

  // Everything above the hips turned about the upright: to his left for more, to his right for less.
  twistTorso(a) {
    const { wt } = this.pose, sj = this.upperBody[0] * 3;
    quatAxisAngle(ikQ, 0, 0, 1, 0, a);
    this.rigid(this.upperBody, ikQ, wt[sj], wt[sj + 1], wt[sj + 2]);
  }

  // The weapon arm put out along a line and the weapon pointed down it, for so long: a mace levelled for the beam that
  // comes off its head, a spear held to the sky, a hand on the wind it's working. d: the line. o: side, aim (false: the
  // arm alone), lean (the body with it, forward for more), in (seconds to get there).
  pointAt(d, secs, o = {}) { this.point = { d: norm([d[0], d[1], d[2]]), t: 0, dur: secs, side: o.side || 'r', aim: o.aim !== false, in: o.in ?? 0.14, lean: o.lean || 0 }; }

  posePoint() {
    const p = this.point, { wt } = this.pose, w = ease(Math.min(p.t / p.in, (p.dur - p.t) / 0.2)), s = Math.sin(this.yaw), c = Math.cos(this.yaw), sd = p.side === 'r' ? -1 : 1;
    if (p.lean) { const sj = this.upperBody[0] * 3; quatAxisAngle(ikQ, 0, c, 0, -s, p.lean * w); this.rigid(this.upperBody, ikQ, wt[sj], wt[sj + 1], wt[sj + 2]); }
    const U = this.arms[p.side].u * 3, L = this.armLen(p.side) * 0.94, d = p.d;
    this.reachTo(p.side, wt[U] + d[0] * L, wt[U + 1] + d[1] * L, wt[U + 2] + d[2] * L, [c * sd * 0.4, -1, -s * sd * 0.4], w);
  }

  // A throw with no clip in it: the arm back behind the head and whipped forward, the shoulders turning with it. Either
  // arm, standing or at a run (the legs are left to whatever they're doing). fn: as it leaves the hand, half-way through.
  // yaw: the way it's thrown, if not the way he faces (the body turns to it from the waist).
  toss(side, secs, fn, yaw = null) { this.tossing = { side, t: 0, dur: secs, fn, done: false, yaw }; }

  poseToss() {
    const q = this.tossing, u = q.t / q.dur, sd = q.side === 'l' ? 1 : -1, { wt } = this.pose, k2 = this.rig.height / 1.8;
    // (From the shoulder: out to its own side, up, forward. Cocked; let go; followed through.)
    const C = [0.14, 0.4, -0.26], R = [0.04, 0.14, 0.58], F = [-0.2, -0.28, 0.4];
    let p, w, tw;
    if (u < 0.36) { const k = ease(u / 0.36); p = C; w = k; tw = 0.4 * k; }
    else if (u < 0.56) { const k = ((u - 0.36) / 0.2) ** 2; p = [C[0] + (R[0] - C[0]) * k, C[1] + (R[1] - C[1]) * k, C[2] + (R[2] - C[2]) * k]; w = 1; tw = 0.4 - 0.75 * k; }
    else { const k = ease((u - 0.56) / 0.44); p = [R[0] + (F[0] - R[0]) * k, R[1] + (F[1] - R[1]) * k, R[2] + (F[2] - R[2]) * k]; w = 1 - k; tw = -0.35 * (1 - k); }
    const env = Math.min(1, u / 0.2, (1 - u) / 0.3), off = q.yaw === null ? 0 : clamp(wrapAngle(q.yaw - this.yaw), -1.3, 1.3), ya = this.yaw + off;
    this.twistTorso(tw * sd + off * ease(env));
    const s = Math.sin(ya), c = Math.cos(ya), ox = c * sd, oz = -s * sd, U = this.arms[q.side].u * 3;
    this.reachTo(q.side, wt[U] + (ox * p[0] + s * p[2]) * k2, wt[U + 1] + p[1] * k2, wt[U + 2] + (oz * p[0] + c * p[2]) * k2, [ox * 0.8, -0.6, oz * 0.8], w);
  }

  // Both arms held out wide, a blade's length from each shoulder: a body that's turning with something in each fist.
  poseSpread() {
    const { wt } = this.pose, w = this.spread, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    for (const [side, sd] of [['l', 1], ['r', -1]]) {
      const U = this.arms[side].u * 3, L = this.armLen(side) * 0.96;
      this.reachTo(side, wt[U] + c * sd * L * 0.97 + s * L * 0.12, wt[U + 1] - L * 0.12, wt[U + 2] - s * sd * L * 0.97 + c * L * 0.12, [-s, -0.3, -c], w);
    }
  }

  // The bow drawn by the arms themselves: the body side-on behind it, the bow arm out straight at the mark (or up, for an
  // arrow meant to fall), the head left looking down the arrow, and the string hand back along the line to the cheek, as far
  // as it's drawn.
  poseBow() {
    const { wt } = this.pose, w = this.bowW, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.twistTorso(-0.8 * w);
    const hj = this.headBits[0] * 3;
    quatAxisAngle(ikQ, 0, 0, 1, 0, 0.6 * w);
    this.rigid(this.headBits, ikQ, wt[hj], wt[hj + 1], wt[hj + 2]);
    const cp = Math.cos(this.bowPitch), d = [s * cp, Math.sin(this.bowPitch), c * cp];
    const A = this.arms.l, U = A.u * 3, H = A.h * 3, L = this.armLen('l') * 0.97;
    this.reachTo('l', wt[U] + d[0] * L, wt[U + 1] + d[1] * L, wt[U + 2] + d[2] * L, [c * 0.3, -1, -s * 0.3], w);
    const back = 0.14 + 0.5 * this.pull;
    this.reachTo('r', wt[H] - d[0] * back - c * 0.03, wt[H + 1] - d[1] * back + 0.02, wt[H + 2] - d[2] * back + s * 0.03, [-c * 0.8 - s * 0.5, 0.2, s * 0.8 - c * 0.5], w);
  }

  // Joints moved as one piece: turned by q about a point.
  rigid(list, q, px, py, pz) {
    const { wq, wt } = this.pose;
    for (const j of list) {
      ikV[0] = wt[j * 3] - px; ikV[1] = wt[j * 3 + 1] - py; ikV[2] = wt[j * 3 + 2] - pz;
      quatRotate(ikV, 0, q, 0, ikV, 0);
      wt[j * 3] = px + ikV[0]; wt[j * 3 + 1] = py + ikV[1]; wt[j * 3 + 2] = pz + ikV[2];
      quatMul(wq, j * 4, q, 0, wq, j * 4);
    }
  }

  // The whole body turned over about its hips: forward (a flip) and sideways (a cartwheel).
  tumble() {
    const { wt } = this.pose, pj = this.J.pelvis * 3, s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    quatAxisAngle(ikQ, 0, c, 0, -s, this.bodyFlip);
    if (this.bodyRoll) { quatAxisAngle(ikQ2, 0, s, 0, c, this.bodyRoll); quatMul(ikQ, 0, ikQ2, 0, ikQ, 0); }
    if (!this.allJoints) this.allJoints = Array.from({ length: this.rig.count }, (_, i) => i);
    this.rigid(this.allJoints, ikQ, wt[pj], wt[pj + 1] + 0.1, wt[pj + 2]);
  }

  // One arm's hand put at a point: shoulder where it is, the elbow out toward `pole`, upper arm and forearm turned to
  // reach, and the hand and its fingers carried with the forearm. w: how far from where the clip had it (0) to there (1).
  reachTo(side, tx, ty, tz, pole, w = 1) {
    const { wq, wt } = this.pose, A = this.arms[side], U = A.u * 3, F = A.f * 3, H = A.h * 3;
    const sx = wt[U], sy = wt[U + 1], sz = wt[U + 2];
    const e0 = [wt[F] - sx, wt[F + 1] - sy, wt[F + 2] - sz], h0 = [wt[H] - wt[F], wt[H + 1] - wt[F + 1], wt[H + 2] - wt[F + 2]];
    const L1 = Math.hypot(...e0), L2 = Math.hypot(...h0);
    tx = wt[H] + (tx - wt[H]) * w; ty = wt[H + 1] + (ty - wt[H + 1]) * w; tz = wt[H + 2] + (tz - wt[H + 2]) * w;
    let dx = tx - sx, dy = ty - sy, dz = tz - sz, d = Math.hypot(dx, dy, dz) || 1e-6;
    const most = (L1 + L2) * 0.995;
    if (d > most) { dx *= most / d; dy *= most / d; dz *= most / d; d = most; }
    const ux = dx / d, uy = dy / d, uz = dz / d;
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), hgt = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const pd = pole[0] * ux + pole[1] * uy + pole[2] * uz;
    const pp = norm([pole[0] - ux * pd, pole[1] - uy * pd, pole[2] - uz * pd]);
    const ex = ux * a + pp[0] * hgt, ey = uy * a + pp[1] * hgt, ez = uz * a + pp[2] * hgt;
    // The upper arm onto its new line, then the forearm (already carried by that) onto its own.
    fromTo(ikQ, norm(e0), norm([ex, ey, ez]));
    quatRotate(ikV2, 0, ikQ, 0, h0, 0);
    fromTo(ikQ2, norm([ikV2[0], ikV2[1], ikV2[2]]), norm([dx - ex, dy - ey, dz - ez]));
    quatMul(ikQ3, 0, ikQ2, 0, ikQ, 0);
    quatMul(wq, A.u * 4, ikQ, 0, wq, A.u * 4);
    quatMul(wq, A.f * 4, ikQ3, 0, wq, A.f * 4);
    const hx = wt[H], hy = wt[H + 1], hz = wt[H + 2];
    wt[F] = sx + ex; wt[F + 1] = sy + ey; wt[F + 2] = sz + ez;
    this.rigid(A.fingers, ikQ3, hx, hy, hz);
    quatMul(wq, A.h * 4, ikQ3, 0, wq, A.h * 4);
    const mx = sx + dx - hx, my = sy + dy - hy, mz = sz + dz - hz;
    wt[H] = sx + dx; wt[H + 1] = sy + dy; wt[H + 2] = sz + dz;
    for (const k of A.fingers) { wt[k * 3] += mx; wt[k * 3 + 1] += my; wt[k * 3 + 2] += mz; }
  }

  // The lute in the hands, and the hands on it: the left on the neck, the right at the strings, doing what the tune asks.
  // Three ways of playing (tune.v): 0 a steady strum, down and up across the strings, the body swaying with it;
  // 1 picking, small and quick, bent over the neck with the left hand running up and down it; 2 the great wheeling strum,
  // the arm thrown up and round and down through every string, the neck raised and the back arched.
  poseLute() {
    const { wq, wt } = this.pose, tn = this.tune, w = this.luteW, L = this.luteP, u = this.rig.height / 1.8;
    const t = tn ? tn.t : 0, v = tn ? tn.v : 0, bpm = tn?.rate || 1;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    let across = 0, lift = 0.04, slide = 0, lean = 0, sway = 0, raise = 0, alongY = 0;
    let twist = 0, nod = 0, wheel = 0, wheelOut = 0;
    if (v === 1) {
      // (Bent right over it, head down over the neck, the wrist quick and small: the body's the picture, bobbing with the run.)
      const ph = t * 5.6 * bpm * 6.2832;
      across = 0.06 * Math.sin(ph * 1.5); lift = 0.03 + 0.02 * Math.cos(ph * 3);
      slide = 0.1 * Math.sin(t * 1.7 * bpm) + 0.04 * Math.sin(t * 4.3 * bpm);
      lean = 0.46 + 0.05 * Math.sin(ph * 0.5); sway = 0.04 * Math.sin(t * 2.8 * bpm); nod = 0.34 + 0.08 * Math.sin(ph * 0.5);
    } else if (v === 2) {
      // (One wheel a beat: the hand at the strings; then out to his side and up over his shoulder, elbow first; a moment
      // there with his back arched; down outside himself and through the strings in a twelfth of a second; past them to
      // the hip, the body dipping after it.)
      const beat = (t * 0.95 * bpm) % 1;
      const th = (beat < 0.28 ? 0 : beat < 0.55 ? 0.5 * ((beat - 0.28) / 0.27) ** 1.4 : beat < 0.65 ? 0.5 : beat < 0.75 ? 0.5 + 0.5 * ((beat - 0.65) / 0.1) ** 1.5 : 1) * 6.2832;
      const past = beat >= 0.75 ? Math.sin((beat - 0.75) / 0.25 * Math.PI) : 0;
      across = 0.26 * past; alongY = -0.1 * past; lift = 0.05; wheel = (1 - Math.cos(th)) * 0.5; wheelOut = Math.abs(Math.sin(th));
      raise = 0.3 + 0.1 * Math.sin(th); lean = -0.22 * wheel + 0.18 * past; sway = 0.05 * Math.sin(th); twist = -0.16 * wheel - 0.12 * past; nod = 0.14 * past;
      slide = 0.04 * Math.sin(t * 1.3);
    } else {
      // (Down on the beat harder than up, the hand a hand's breadth past the strings each way so the elbow's seen to work;
      // the shoulders turn against it, the head comes down on the downstroke, and the left hand shifts on the neck.)
      const ph = t * 2.7 * bpm * 6.2832;
      across = 0.24 * Math.sin(ph) + 0.04 * Math.sin(ph * 2); lift = 0.04 + 0.04 * Math.cos(ph);
      slide = 0.07 * Math.round(Math.sin(t * 1.35 * bpm * 6.2832 * 0.5) * 1.2);
      lean = 0.07 + 0.06 * Math.sin(ph); sway = 0.06 * Math.sin(ph * 0.5); twist = 0.12 * Math.sin(ph); nod = 0.14 * Math.max(0, Math.sin(ph));
    }
    lean += tn?.lean || 0;
    // The body with the tune, from the waist.
    if (lean || sway) {
      const sj = this.upperBody[0] * 3;
      quatAxisAngle(ikQ, 0, c, 0, -s, lean * w);
      quatAxisAngle(ikQ2, 0, s, 0, c, sway * w);
      quatMul(ikQ, 0, ikQ2, 0, ikQ, 0);
      this.rigid(this.upperBody, ikQ, wt[sj], wt[sj + 1], wt[sj + 2]);
    }
    if (twist) this.twistTorso(twist * w);
    if (nod) { const hj = this.headBits[0] * 3; quatAxisAngle(ikQ, 0, c, 0, -s, nod * w); this.rigid(this.headBits, ikQ, wt[hj], wt[hj + 1], wt[hj + 2]); }
    // The lute by the chest.
    const j = this.J.spine3, lq = this.luteQ || (this.luteQ = new Float32Array(4)), lt = this.luteT || (this.luteT = new Float32Array(3));
    quatMul(lq, 0, wq, j * 4, this.lutePlayQ, 0);
    quatRotate(lt, 0, wq, j * 4, this.lutePlayT, 0);
    lt[0] += wt[j * 3]; lt[1] += wt[j * 3 + 1]; lt[2] += wt[j * 3 + 2];
    if (raise) { quatAxisAngle(ikQ, 0, 0, 0, 1, raise * w); quatMul(lq, 0, lq, 0, ikQ, 0); }
    const X = [0, 0, 0], Y = [0, 0, 0], Z = [0, 0, 0];
    quatRotate(X, 0, lq, 0, [1, 0, 0], 0); quatRotate(Y, 0, lq, 0, [0, 1, 0], 0); quatRotate(Z, 0, lq, 0, [0, 0, 1], 0);
    const at = (x, y, z) => [lt[0] + X[0] * x + Y[0] * y + Z[0] * z, lt[1] + X[1] * x + Y[1] * y + Z[1] * z, lt[2] + X[2] * x + Y[2] * y + Z[2] * z];
    // Each wrist a fist's length short of what the fist is on, along the way the forearm comes to it.
    const put = (side, p, pole) => {
      const A = this.arms[side], U = A.u * 3;
      const dx = p[0] - wt[U], dy = p[1] - wt[U + 1], dz = p[2] - wt[U + 2], d = Math.hypot(dx, dy, dz) || 1, k = 0.07 * u / d;
      this.reachTo(side, p[0] - dx * k, p[1] - dy * k, p[2] - dz * k, pole, w);
    };
    // (His left is (c, 0, -s). The left elbow hangs down and out; the right is out behind the bowl.)
    put('l', at(L.neck[0], L.neck[1] + slide, L.neck[2] - L.neckR - 0.01), [c * 0.5 - s * 0.2, -1, -s * 0.5 - c * 0.2]);
    let pr = at(across, L.strum + alongY, lift);
    // (The wheel: from the strings out and up to above his own right shoulder, the arm thrown high, and down before him onto them again.)
    if (wheel) {
      const U = this.arms.r.u * 3, rx = -c, rz = s, top = [wt[U] + (rx * 0.3 + s * 0.05) * u, wt[U + 1] + 0.5 * u, wt[U + 2] + (rz * 0.3 + c * 0.05) * u];
      pr = [pr[0] + (top[0] - pr[0]) * wheel + rx * wheelOut * 0.42 * u, pr[1] + (top[1] - pr[1]) * wheel, pr[2] + (top[2] - pr[2]) * wheel + rz * wheelOut * 0.42 * u];
    }
    put('r', pr, [-c * 0.9 - s * 0.5, -0.45, s * 0.9 - c * 0.5]);
    this.luteLive = true;
  }

  // Take up the lute and play: for so many seconds, in one of the three ways (poseLute). The notes and the sound it throws
  // off are drawn while it's played (strumFx, src/sim/heroskills.js). o: elem (the notes' colour), rate (how fast), quiet.
  playLute(seconds, v = 0, o = {}) {
    if (!this.luteP || this.dead) return false;
    if (this.tune) { this.tune.dur = Math.max(this.tune.dur, this.tune.t + seconds); this.tune.v = v; Object.assign(this.tune, o); }
    else this.tune = { t: 0, dur: seconds, v, beat: -1, ...o };
    return true;
  }

  animate(dt, sim) {
    // A gesture asked for by the words, or a song, plays as a whole-body clip; ended when it's done (loops are timed).
    if (this.action && !this.swing && !this.dead && !this.surf && !this.jump) {
      const c = this.action;
      if (this.gesture && this.gestureT <= 0) { this.gesture = null; this.stopAction(0.3); }
      else if (!this.gesture && !c.loop && this.actT >= c.dur * 0.95) this.stopAction(0.25);
      else if (!this.gesture && !this.sitting && c.loop && c.name !== 'Crouch_Idle_Loop') this.stopAction(0.25);
      // Set off walking mid-gesture: a wave or a word stays in the arms and the legs walk; a dance or a kneel just stops.
      else if (this.gesture && this.actMask === 'full' && !this.sitting && this.speed > 0.35) {
        if (WHOLE_BODY.has(this.gesture)) { this.gesture = null; this.stopAction(0.25); }
        else { this.rFrom.set(this.pose.rot); this.pFrom.set(this.pose.pelvis); this.fromW = 1; this.fadeTime = 0.25; this.actMask = 'upper'; }
      }
    }
    super.animate(dt, sim);
  }

  gesture_(name, seconds) {
    if (this.dead || this.swing || this.surf || this.foe || !this.active) return;
    const list = GESTURES[name];
    if (!list) return;
    const moving = this.speed > 0.35 && !this.sitting;
    if (moving && WHOLE_BODY.has(name)) return;
    const clip = list[Math.floor(Math.random() * list.length)];
    if (!this.bank.clips[clip]) return;
    this.play(clip, 1, moving ? 'upper' : 'full', 0.25);
    this.gesture = name;
    this.gestureT = seconds ?? Math.min(6, this.bank.clips[clip].dur * (this.bank.clips[clip].loop ? 2 : 1));
  }

  write(snap, cOff, sim) {
    if (!this.visible && !(this.dead && !this.hidden && this.near < VIEW)) {
      snap[cOff + C.ACTIVE] = 0;
      snap.fill(0, cOff + C_PROPS, cOff + C_PROPS + 64);
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
    snap[o + 1] = shown ? this.pose.wt[h + 1] + (this.y - (this.posedY ?? this.y)) + 0.32 * this.rig.height / 1.8 : 0;
    snap[o + 2] = this.x; snap[o + 3] = this.y; snap[o + 4] = this.z;
    snap[o + 5] = this.hp / this.maxHp;
    snap[o + 6] = this.person.level;
    snap[o + 7] = this.party ? this.party.id : -1;
    snap[o + 8] = ACT_CODES[this.task?.kind] ?? 0;
    snap[o + 9] = this.dead ? 1 : 0;
    snap[o + 10] = this.below > 0 ? 1 : 0;
    snap[o + 11] = this.foe ? 1 : 0;
    // Your party: hired, what they're for (1 tank, 2 healer, 3 damage); and a quartermaster's post (1 town, 2 the Warrens).
    snap[o + 12] = this.hired ? 1 : 0;
    snap[o + 13] = this.hired ? { tank: 1, heal: 2, dps: 3 }[this.role] : 0;
    snap[o + 14] = this.broker ? (this.broker === 'town' ? 1 : 2) : 0;
    snap[o + 15] = this.hp;
  }
}

export const ACT_NAMES = ['town', 'hunt', 'delve', 'summit', 'surf', 'errands', 'social', 'perform', 'rest', 'return', 'duel', 'help'];
const ACT_CODES = Object.fromEntries(ACT_NAMES.map((n, i) => [n, i]));
const propQ = new Float32Array(4), propT = new Float32Array(3), propM = new Float32Array(16), flowDir = new Float32Array(2), surfPos = new Float32Array(3);
const ikQ = new Float32Array(4), ikQ2 = new Float32Array(4), ikQ3 = new Float32Array(4), ikV = new Float32Array(3), ikV2 = new Float32Array(3);
const ease = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
// The least turn that takes one unit direction onto another.
function fromTo(out, a, b) {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (d < -0.9999) { const x = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], k = norm(cross(a, x)); out[0] = k[0]; out[1] = k[1]; out[2] = k[2]; out[3] = 0; return; }
  const cx = a[1] * b[2] - a[2] * b[1], cy = a[2] * b[0] - a[0] * b[2], cz = a[0] * b[1] - a[1] * b[0], w = 1 + d, l = 1 / Math.hypot(cx, cy, cz, w);
  out[0] = cx * l; out[1] = cy * l; out[2] = cz * l; out[3] = w * l;
}
// A direction turned by `ang` about the level axis (kx, 0, kz) (Rodrigues).
function bankAbout(v, kx, kz, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), d = (kx * v[0] + kz * v[2]) * (1 - c);
  return [v[0] * c + (-kz * v[1]) * s + kx * d, v[1] * c + (kz * v[0] - kx * v[2]) * s, v[2] * c + (kx * v[1]) * s + kz * d];
}

// ---- the world of heroes: their days, their parties, their meetings ----------------------------------------------------

export class HeroWorld {
  constructor(sim, heroes) {
    this.sim = sim; this.heroes = heroes;
    this.shots = []; this.zones = []; this.timers = []; this.cords = []; this.dots = [];
    this.parties = []; this.partyId = 1;
    this.hour = 12;
    this.killed = [];              // monsters heroes have killed, for standing them again
    this.targets = [];
    this.firsts = new Set();       // big monsters someone has already had the first kill of
    this.duels = [];
    // Your party, hired of the Free Company's quartermasters: up to four, who go where you go (companion, below).
    this.company = { id: 900, leader: null, members: new Set(), kind: 'company', place: null, state: 'going', t: 0, want: 4, company: true };
    this.trail = [];
    // Everyone starts about the town, at their own business.
    const town = PLACES.filter((p) => p.kind === 'town');
    for (const h of heroes) {
      const g = h.broker ? { x: BROKER_SPOTS[h.broker][0], z: BROKER_SPOTS[h.broker][1] } : this.spotIn(pick(town), h);
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

  // ---- how the classes hurt things (never through the player's spells: a hero's kill is the hero's) ----

  // Everything fightable within r of a point (with its own girth): landings, novas, finishers. o as Hero.hit, plus skip.
  blast(owner, x, z, y, r, dmg, o = {}) {
    const struck = [];
    for (const m of this.targets) {
      if (!fightable(m) || m === o.skip || Math.hypot(m.x - x, m.z - z) > r + radiusOf(m) || Math.abs(m.y - y) > 2.5) continue;
      if (owner.hit(this.sim, m, dmg, o.kind || 'bash', o.poise ?? 40, 0, { ...o, fromX: x, fromZ: z })) struck.push(m);
    }
    return struck;
  }

  // Everything within halfW of a line from (x0, z0), len long along dir: thrusts.
  line(owner, x0, z0, dir, len, halfW, dmg, o = {}) {
    const ux = Math.sin(dir), uz = Math.cos(dir), struck = [];
    for (const m of this.targets) {
      if (!fightable(m)) continue;
      const dx = m.x - x0, dz = m.z - z0, along = dx * ux + dz * uz;
      if (along < -0.3 || along > len + radiusOf(m) || Math.abs(dx * uz - dz * ux) > halfW + radiusOf(m) || Math.abs(m.y - owner.y) > 2.5) continue;
      if (owner.hit(this.sim, m, dmg, o.kind || 'puncture', o.poise ?? 30, o.knock || 0, o)) struck.push(m);
    }
    return struck;
  }

  // Knocked off its stride for a moment (the dead reel; the rest only flinch, as they do from anything).
  stun(m, seconds, by) { if (m instanceof Zombie && !m.crawling) m.reel?.(this.sim, seconds, by); }

  // A cut that runs: 30% of the blow each second for three seconds. Another cut refreshes it rather than stacking.
  bleed(owner, m, dps) {
    const d = this.dots.find((q) => q.m === m);
    if (d) { d.dps = Math.max(d.dps, dps); d.t = BLEED; d.owner = owner; }
    else this.dots.push({ owner, m, dps, t: BLEED, tick: 0.5 });
  }

  stepDots(dt) {
    for (const d of this.dots) {
      d.t -= dt; d.tick -= dt;
      if (d.tick <= 0) { d.tick += 0.5; if (!d.owner.dead) d.owner.hit(this.sim, d.m, d.dps * 0.5, 'gash', 0, 0, { dot: true }); }
    }
    this.dots = this.dots.filter((d) => d.t > 0 && fightable(d.m));
  }

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
    this.stepDots(dt);
    this.stepParties(dt);
    this.stepCompany(dt);
    this.stepRespawns(dt);
    this.stepMeetings(dt);
    // Dawn and dusk, said once each by someone in town.
    const band = hourBand(this.hour);
    if (this.lastBand !== undefined && band !== this.lastBand) {
      const inTown = this.heroes.filter((h) => h.active && !h.dead && townDist(h.x, h.z) < 0);
      const h = inTown[Math.floor(Math.random() * inTown.length)];
      if (h) h.say(sim, band === 1 ? 'dawn' : band === 3 ? 'dusk_town' : band === 0 ? 'goodnight' : 'town_idle');
      if (band === 3) for (const x of this.heroes) if (x.task && x.task.kind === 'hunt' && townDist(x.x, x.z) > 30 && Math.random() < 0.5) { x.say(sim, 'night_falls_out'); this.goHome(x); }
    }
    this.lastBand = band;
  }

  // Your party's lights: a spirit-light over each one's shoulder, as the Wisp Light is over yours, so you can see them, and
  // they the ground, in the dark. By night, in the Warrens and below ground it lights them and a pool round their feet; by
  // day it's a small glow over them and lights nothing. Drawn each tick with the rest (drawFx). The lights themselves go
  // out as FX_CARRIED, which the renderer puts before the spells' own (src/gfx/spellfx.js).
  partyLights() {
    const sim = this.sim, c = sim.casting, now = sim.time, dt = clamp(now - (this.lampT ?? now), 0, 0.1);
    this.lampT = now;
    const night = this.hour < DAWN_HOUR + 0.5 || this.hour >= DUSK_HOUR - 0.5;
    // (Nearest first: a phone has room for only two of them.)
    const lit = [...this.company.members].filter((h) => !h.dead && !h.hidden && h.visible && h.near < 90).sort((a, b) => a.near - b.near);
    for (const h of this.company.members) if (!lit.includes(h)) h.wisp = null;
    for (const h of lit) {
      const s = Math.sin(h.yaw), co = Math.cos(h.yaw), side = h.slot % 2 ? 1 : -1;
      // Over the shoulder and a little ahead, clear of the head, so it lights the face and chest rather than the inside of
      // the helm (a point light casts no shadow), and its pool falls round their feet.
      const tx = h.x + s * 0.28 + co * side * 0.5, tz = h.z + co * 0.28 - s * side * 0.5, ty = h.y + h.rig.height + 0.28;
      const w = h.wisp || (h.wisp = { x: tx, y: ty, z: tz, t: (h.slot * 1.7) % 6 });
      w.t += dt;
      const k = 1 - Math.exp(-dt * 6);
      w.x += (tx - w.x) * k; w.y += (ty + Math.sin(w.t * 1.9) * 0.06 - w.y) * k; w.z += (tz - w.z) * k;
      const dark = night || h.y < -6 || inDungeon(h.x, h.z);
      c.fx(FX.ORB, ELEM.LIGHT, w.x, w.y, w.z, dark ? 0.045 : 0.032, 0, 1, 0, 0, dark ? 0.9 : 0.45, 0, 0, 0, 0.7);
      if (dark) {
        c.fx(FX.FLARE, ELEM.LIGHT, w.x, w.y, w.z, 0.13, 0, 1, 0, 0, 0.2, 0, 0, 0.5, 0.3);
        c.fx(FX.LIGHT, ELEM.LIGHT, w.x, w.y, w.z, 0, 0, 1, 0, 0, 1, 4.2, 10, 0, 0, FX_CARRIED);
      }
    }
  }

  // Drawn after the spells' own shapes each tick (Sim.step), so they share the frame's budget without being wiped.
  drawFx() {
    const c = this.sim.casting;
    this.partyLights();
    for (const [a, b, elem, k] of this.cords) {
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1;
      c.fx(FX.BEAM, elem, a[0], a[1], a[2], 0.006, dx / L, dy / L, dz / L, L, 0.9 * k, 0.6 * k, 1.2, 0, 0, 0.006);
    }
    for (const s of this.shots) {
      if (s.owner.near > 100) continue;
      if (s.draw) { if (!(s.wait > 0)) s.draw(c, s); continue; }
      if (s.kind === 'arrow') {
        arrow3(c, s.x, s.y, s.z, s.vx, s.vy, s.vz, s.elem, s.rain ? 1.5 : 1);
      } else if (s.kind === 'hammer') {
        // The paladin's hammer: a hammer, gold-headed, tumbling end over end the way it flies, in its own light.
        const o = s.owner, big = 1.5 + 0.08 * rank(o), home = s.out ? [s.tx, s.ty, s.tz] : [o.x, o.y + 1.2, o.z], yaw = Math.atan2(home[0] - s.x, home[2] - s.z);
        hammer3(c, s.x, s.y, s.z, yaw, s.t * 15, big, ELEM.LIGHT, 1.3, 9);
        c.fx(FX.TRAIL, ELEM.LIGHT, s.x, s.y, s.z, 0.2, -Math.sin(yaw), 0, -Math.cos(yaw), 2, 0.7);
      } else if (s.kind === 'note') {
        // The song's own glyph, trailing the five lines of a stave.
        const v = Math.hypot(s.vx, s.vy, s.vz) || 1;
        c.fx(FX.RUNE, s.elem, s.x, s.y, s.z, 0.15, 0, 1, 0, 0, 0.9, 3, 3, 0, s.t * 2);
        for (let k = 0; k < 5; k++) c.fx(FX.TRAIL, s.elem, s.x, s.y + (k - 2) * 0.05, s.z, 0.01, -s.vx / v, -s.vy / v, -s.vz / v, 0.7, 0.6, 0, 0, 0, k * 0.2);
      }
    }
    // The lancer's couched lance as he charges; the dragoon's, aimed along his leap.
    for (const h of this.heroes) {
      if (!h.visible || h.near > 80) continue;
      if (h.charge && h.charge.left > 0) {
        if (h.charge.draw) h.charge.draw(c, h);
        else if (h.charge.lancer) {
          // The lancer's: the lance's light three deep down its length and past its point, a ring where the vamplate
          // is, and a board of light going before him.
          const p = h.handPos('r'), ax = Math.sin(h.charge.dir), az = Math.cos(h.charge.dir), big = 1 + 0.06 * rank(h);
          c.fx(FX.BEAM, ELEM.STORM, p[0], p[1], p[2], 0.2 * big, ax, 0, az, 3.4, 0.35, 0, 0, 0, 0, 0.03);
          c.fx(FX.BEAM, ELEM.STORM, p[0], p[1], p[2], 0.08 * big, ax, 0, az, 3.4, 1, 8, 5, 0, 0, 0.02);
          // (The flare on the lance's own point, wherever that is.)
          const pm = h.propMatrices, rr = h.mainP?.reach ?? 2;
          c.fx(FX.FLARE, ELEM.LIGHT, pm[12] + pm[4] * rr, pm[13] + pm[5] * rr, pm[14] + pm[6] * rr, 0.3, 0, 1, 0, 0, 1);
          c.fx(FX.GLYPH, ELEM.STORM, p[0] + ax * 0.5, p[1], p[2] + az * 0.5, 0.42, ax, 0, az, 0, 0.8, 0, 0, 0, 0, 10);
          for (let i = 0; i < 3; i++) c.fx(FX.TRAIL, ELEM.STORM, h.x - az * (i - 1) * 0.3, h.y + 0.6 + i * 0.35, h.z + ax * (i - 1) * 0.3, 0.14, -ax, 0, -az, 2.6, 0.6);
        }
      }
      // (A leap's own look while it's in the air: the dragoon's spear lit down its length, a rogue's colours.)
      const j = h.jump;
      if (j && j.phase === 1) j.L?.draw?.(c, h, j);
      if (h.nock) { const n = h.nock; c.fx(FX.LANCE, h.stringElem, n[0], n[1], n[2], 0.012, n[3], n[4], n[5], n[6], 1); }
    }
    // The boomerang knights' own, in the air: each in its colour, a streak behind it and a ring of it turning.
    for (const h of this.heroes) {
      if (!h.flight || !h.visible || h.near > 80) continue;
      for (const f of h.flight) {
        const e = f.glow ?? ELEM.SPIRIT;
        c.fx(FX.TRAIL, e, f.x, f.y, f.z, 0.1, -(f.tx ?? 0), 0, -(f.tz ?? 1), 1.3, 0.8);
        c.fx(FX.GLYPH, e, f.x, f.y + 0.02, f.z, 0.42, 0, 1, 0, f.spin || 0, 0.7, 3, 3, 0, 0, 8);
      }
    }
    // Bleeding: a drip or two.
    for (const d of this.dots) {
      const m = d.m;
      if (Math.hypot(m.x - this.sim.player.x, m.z - this.sim.player.z) > 50) continue;
      c.fx(FX.TRAIL, ELEM.DRAIN, m.x + (Math.random() - 0.5) * 0.4, m.y + 0.8 + Math.random() * 0.5, m.z + (Math.random() - 0.5) * 0.4, 0.02, 0, 1, 0, 0.25, 0.8);
    }
    for (const z of this.zones) {
      if (z.owner.near > 100) continue;
      if (z.draw) { z.draw(c, z); continue; }
      if (z.kind === 'consecrate') {
        const k = Math.min(1, z.t * 3, (z.life - z.t) * 1.5);
        c.fx(FX.DISC, ELEM.LIGHT, z.x, z.y + 0.04, z.z, z.r, 0, 1, 0, 0, 0.75 * k, 10 * k, z.r * 2);
        c.fx(FX.RING, ELEM.LIGHT, z.x, z.y + 0.06, z.z, z.r * (0.94 + 0.04 * Math.sin(z.t * 6)), 0, 1, 0, 0, 0.5 * k);
        c.fx(FX.RUNE, ELEM.LIGHT, z.x, z.y + 0.08, z.z, z.r * 0.9, 0, 1, 0, 0, 0.42 * k, 0, 0, z.t * 0.1, 0.3, 1);   // (extra 1: the holy mark, rays and a cross)
        // (Crosses of light rising off it, and a pillar's faint standing glow.)
        let n = 0;
        for (const m of this.targets) { if (n >= 5 || !fightable(m) || Math.hypot(m.x - z.x, m.z - z.z) > z.r + 0.4) continue; const u = (z.t * 0.9 + n * 0.37) % 1; c.fx(FX.GLYPH, ELEM.LIGHT, m.x, m.y + 0.3 + u * 1.8, m.z, 0.15, 0, 0, 0, 0, 0.7 * k * (1 - u), 0, 0, 0, n, 7); c.fx(FX.RING, ELEM.LIGHT, m.x, m.y + 0.07, m.z, 0.45, 0, 1, 0, 0, 0.5 * k); n++; }
        c.fx(FX.COLUMN, ELEM.LIGHT, z.x, z.y, z.z, 2.6, 0, 1, 0, z.r * 1.3, 0.22 * k);
      } else if (z.kind === 'blessed') {
        // Hammers, gold-headed, tumbling end over end as they turn round him, each in its own light, a streak behind.
        const k = Math.min(1, z.t * 4, (z.life - z.t) * 3), big = 0.95 + 0.07 * rank(z.owner);
        this.hammers(z).forEach(([hx, hy, hz, a], i) => {
          hammer3(c, hx, hy, hz, a + Math.PI / 2, z.t * 13 + i * 1.3, big * k, ELEM.LIGHT, 1.25, i === 0 ? 7 : 0);
          c.fx(FX.TRAIL, ELEM.LIGHT, hx, hy, hz, 0.11, -Math.cos(a), 0, Math.sin(a), 1.2, 0.7 * k);
        });
        c.fx(FX.RING, ELEM.LIGHT, z.owner.x, z.owner.y + 0.06, z.owner.z, Math.min(4, 0.45 + z.t * 2.4), 0, 1, 0, 0, 0.35 * k);
      } else if (z.kind === 'smoke') {
        // The rogue's smoke where they vanished: puffs rising and spreading, then thinning out.
        // (Thick enough to lose someone in: a bank of it as high as a head, a ring of violet where it lies.)
        const k = Math.min(1, z.t * 12 + 0.3, (z.life - z.t) * 1.2), big = z.r / 3.6;
        for (let i = 0; i < 14; i++) {
          const a = z.seed + i * 0.63, rr = z.r * (((i * 0.37 + z.seed) % 1) * 0.85);
          const y = z.y + 0.3 + ((z.t * 0.3 + i * 0.13) % 1) * 1.7;
          c.fx(FX.PUFF, ELEM.VOID, z.x + Math.sin(a) * rr, z.y + (y - z.y) * (0.5 + 0.5 * big), z.z + Math.cos(a) * rr, (0.8 + Math.min(z.t, 2) * 0.3) * (0.45 + 0.55 * big), 0, 1, 0, 0, 0.7 * k, 0, 0, z.t / z.life, i * 0.1);
        }
        if (z.t < 0.4) c.fx(FX.RING, ELEM.ARCANE, z.x, z.y + 0.06, z.z, z.r, 0, 1, 0, 0, 0.5 * (1 - z.t / 0.4));
      } else if (z.kind === 'barrage') {
        // Eleven spears down round it on a spiral, staggered, near upright, held a moment in the ground.
        for (let i = 0; i < 11; i++) {
          const t0 = (i % 4) * 0.16, at = z.t - t0;
          if (at < 0 || at > 1.17) continue;
          const th = z.seed + i * 2.39996, rho = 0.92 * z.R * Math.sqrt((i + 0.5) / 11);
          const tilt = 0.14 * Math.sin(th * 3.1), len = 1.9 + ((i * 0.618) % 1) * 0.6;
          const dx = Math.sin(th) * tilt, dz = Math.cos(th) * tilt, dl = Math.hypot(dx, 1, dz);
          const k = Math.min(1, at / 0.22), mid = 4 - (4 - 0.75) * k * k;
          const ex = z.x + Math.sin(th) * rho, ez = z.z + Math.cos(th) * rho, ey = z.y + mid;
          // (Spears, with a spear's head: point down, a third of each in the ground, gone again half a second after.)
          const sink = at > 0.45 ? (at - 0.45) / 0.35 * len : 0;
          pike3(c, ex - dx / dl * len / 2, ey + len / 2 - sink, ez - dz / dl * len / 2, dx / dl, -1 / dl, dz / dl, len, ELEM.SPIRIT, 1.2, 1.5);
          if (k < 1) c.fx(FX.TRAIL, ELEM.SPIRIT, ex, ey + len / 2, ez, 0.07, 0, 1, 0, 1.6, 0.6);
        }
      } else if (z.kind === 'planted') {
        // The dragoon's own spear, standing in the ground where he drove it: its light down its length, brightest where it goes in.
        const [gx, gy, gz] = z.at, d = z.d, butt = z.owner.mainP?.butt ?? 0.8, k = 1 - z.t / z.life * 0.5;
        c.fx(FX.BEAM, z.elem, gx - d[0] * butt, gy - d[1] * butt, gz - d[2] * butt, 0.07 * k, d[0], d[1], d[2], z.len + butt, 0.9 * k, 6, 4, 0, 0, 0.03);
        c.fx(FX.FLARE, z.elem, z.x, z.y + 0.1, z.z, 0.4 * k, 0, 1, 0, 0, 1);
      } else if (z.kind === 'song') {
        const o = z.owner;
        for (let i = 0; i < 3; i++) {
          const a = z.t * 1.3 + i * 2.09, r = 0.7 + ((z.t * 0.6 + i * 0.33) % 1) * 1.6;
          c.fx(FX.RUNE, z.elem, o.x + Math.sin(a) * r, o.y + 1.6 + ((z.t * 0.5 + i * 0.3) % 1) * 1.4, o.z + Math.cos(a) * r, 0.16, 0, 1, 0, 0, 0.8, 1.5, 2, 0, i * 0.3);
        }
      }
    }
  }

  // The blessed hammers: they spiral out from the paladin and turn round him wherever he goes. Three, and one more for
  // every second rank of his (z.n).
  hammers(z) {
    const o = z.owner, out = [], r = Math.min(4, 0.45 + z.t * 2.4), n = z.n || 3;
    for (let i = 0; i < n; i++) {
      const a = z.a0 + i * 6.2832 / n + z.t * 5;
      out.push([o.x + Math.sin(a) * r, o.y + 1.1, o.z + Math.cos(a) * r, a]);
    }
    return out;
  }

  stepShots(dt) {
    const sim = this.sim;
    for (const s of this.shots) {
      s.t += dt;
      if (s.kind === 'x') { stepShotX(this, s, dt); continue; }
      if (s.kind === 'hammer') {
        // Out to where the foe stood, through what's there, and back to the paladin's hand.
        const o = s.owner, home = s.out ? [s.tx, s.ty, s.tz] : o.handPos('r');
        const dx = home[0] - s.x, dy = home[1] - s.y, dz = home[2] - s.z, L = Math.hypot(dx, dy, dz);
        // (Turned for home, it can cut what it passed on the way out again.)
        if (L < 0.6) {
          if (s.out) { s.out = false; s.hitSet.clear(); }
          else {
            // (Home: the hand closes on it.)
            s.done = true;
            if (o.fxOk()) sim.casting.burst(FX.FLARE, ELEM.LIGHT, home[0], home[1], home[2], 0.15, 0.6, 0.2, { light: 6, lightR: 3 });
            if (!o.swing && !o.jump && !o.dead) o.play('Sword_Block', 2.2, 'upper', 0.06);
          }
        }
        // (Slower coming home than it went, so it's seen to come.)
        const step = Math.min(L, s.v * (s.out ? 1 : 0.65) * dt);
        // (A wall in its way out turns it for home there: it doesn't go through.)
        if (s.out && L > 1e-3 && sim.world.rayBoxes(s.x, s.y, s.z, dx / L, dy / L, dz / L, step) >= 0) { s.out = false; s.hitSet.clear(); continue; }
        s.x += dx / (L || 1) * step; s.y += dy / (L || 1) * step; s.z += dz / (L || 1) * step;
        for (const m of this.targets) {
          if (!fightable(m) || s.hitSet.has(m) || Math.hypot(m.x - s.x, m.z - s.z) > radiusOf(m) + 0.7) continue;
          // (A hammer that weighs something: the first it strikes holds the world a beat.)
          s.hitSet.add(m); o.hit(sim, m, s.dmg, 'bash', s.out ? 95 : 50, 3, { shove: 3 });
          sim.casting.burst(FX.FLARE, ELEM.LIGHT, s.x, s.y, s.z, 0.3, 1.2, 0.25, { light: 12, lightR: 6 });
        }
        if (s.t > 4) s.done = true;
        continue;
      }
      if (s.kind === 'note') {
        // A note bends toward its foe as it flies, never falling.
        const m = s.foe;
        if (m && fightable(m)) {
          const want = Math.atan2(m.x - s.x, m.z - s.z), have = Math.atan2(s.vx, s.vz);
          const a = have + clamp(wrapAngle(want - have), -3 * dt, 3 * dt), v = Math.hypot(s.vx, s.vz);
          s.vx = Math.sin(a) * v; s.vz = Math.cos(a) * v;
          s.vy = clamp((m.y + 1.2 - s.y) * 3, -4, 4);
        }
      } else s.vy -= (s.kind === 'arrow' ? (s.rain ? 0 : 5) : 2) * dt;
      // A wall, a corner or a pine in its way stops it there. (Not the arrows that go up for the rain, nor the rain itself.)
      if (!s.up && !s.rain) {
        const v = Math.hypot(s.vx, s.vy, s.vz);
        if (v > 1e-3 && sim.world.rayBoxes(s.x, s.y, s.z, s.vx / v, s.vy / v, s.vz / v, v * dt) >= 0) {
          if (s.owner.fxOk()) sim.casting.burst(FX.PUFF, s.elem ?? ELEM.SPIRIT, s.x, s.y, s.z, 0.12, 0.3, 0.25);
          s.done = true; continue;
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      const ground = sim.world.height(s.x, s.z);
      if (s.up) { if (s.t > 0.8) s.done = true; continue; }
      if (s.y < ground || s.t > (s.rain ? 2 : 1.6)) {
        if (s.rain && s.y < ground + 0.3) this.rainHit(s, ground);
        s.done = true; continue;
      }
      for (const m of this.targets) {
        if (!fightable(m)) continue;
        const r = radiusOf(m) + 0.35;
        if (Math.hypot(m.x - s.x, m.z - s.z) > r || s.y < m.y || s.y > m.y + (m instanceof Gravehart ? 3.5 : 2.2) * (m.scale || 1)) continue;
        if (s.rain) this.rainHit(s, ground);
        else s.owner.hit(sim, m, s.dmg, s.kind === 'note' ? 'bash' : 'puncture', 30);
        s.done = true;
        break;
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
  }

  // A falling arrow of the archer's rain, landed: a small burst where it goes in.
  rainHit(s, ground) {
    if (s.owner.dead) return;
    this.blast(s.owner, s.x, s.z, ground, 0.9, s.dmg, { kind: 'puncture', poise: 15, quiet: true });
    if (!s.owner.fxOk()) return;
    // (It stands in the ground where it came down, a moment.)
    const c = this.sim.casting, v = Math.hypot(s.vx, s.vy, s.vz) || 1, ux = s.vx / v, uy = s.vy / v, uz = s.vz / v;
    c.burst(FX.RING, s.elem, s.x, ground + 0.05, s.z, 0.1, 0.7, 0.25);
    c.burst(FX.LANCE, s.elem, s.x - ux * 0.7, ground - uy * 0.7, s.z - uz * 0.7, 0.03, 0.03, 1.2, { ax: ux, ay: uy, az: uz, len: 0.85 });
    if (Math.random() < 0.35) c.burst(FX.PUFF, ELEM.SPIRIT, s.x, ground + 0.15, s.z, 0.15, 0.5, 0.35, { alpha: 0.35 });
  }

  stepZones(dt) {
    const sim = this.sim;
    for (const z of this.zones) {
      z.t += dt;
      if (z.step) { z.step(z, dt); continue; }
      if (z.kind === 'fx') continue;
      if (z.kind === 'consecrate') {
        // Holy ground: every half second it burns what stands on it (the dead twice over), and mends whoever of his own
        // side stands there, the player too.
        if ((z.tick -= dt) > 0) continue;
        z.tick += 0.5;
        for (const m of this.targets) {
          if (!fightable(m) || Math.hypot(m.x - z.x, m.z - z.z) > z.r + radiusOf(m)) continue;
          z.owner.hit(sim, m, 4 * z.owner.power() * (m instanceof Zombie ? 2 : 1), 'burn', 5, 0, { dot: true });
        }
        for (const h of this.heroes) if (!h.dead && h.active && Math.hypot(h.x - z.x, h.z - z.z) < z.r) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * 0.03);
        const p = sim.player;
        if (!p.dead && Math.hypot(p.x - z.x, p.z - z.z) < z.r) p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.03);
      } else if (z.kind === 'blessed') {
        for (const [hx, , hz] of this.hammers(z)) {
          for (const m of this.targets) {
            if (!fightable(m) || Math.hypot(m.x - hx, m.z - hz) > radiusOf(m) + 0.6) continue;
            if (sim.time - (z.hitT.get(m) ?? -9) < 0.33) continue;
            z.hitT.set(m, sim.time); z.owner.hit(sim, m, 4 * z.owner.power(), 'bash', 20);
          }
        }
      } else if (z.kind === 'rain') {
        // The downpour: so many arrows over so long, anywhere in the ring, on the slant they were sent up at.
        const due = z.t < 0 ? 0 : Math.min(z.n, Math.floor(z.t / z.life * z.n) + 1);
        const sx = Math.sin(z.from ?? 0.5) * 7, sz = Math.cos(z.from ?? 0.5) * 7;
        for (; z.dropped < due; z.dropped++) {
          // (Half of them on something that's standing there, the rest anywhere in the ring.)
          const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * z.r, up = 7 + Math.random() * 2, T = up / 19;
          let tx = z.x + Math.sin(a) * r, tz = z.z + Math.cos(a) * r;
          if (z.dropped % 2) { const on = this.targets.filter((m) => fightable(m) && Math.hypot(m.x - z.x, m.z - z.z) < z.r); if (on.length) { const m = on[Math.floor(Math.random() * on.length)]; tx = m.x + (Math.random() - 0.5) * 0.5; tz = m.z + (Math.random() - 0.5) * 0.5; } }
          this.shots.push({ kind: 'arrow', owner: z.owner, x: tx - sx * T, y: z.y + up, z: tz - sz * T, vx: sx, vy: -19, vz: sz, t: 0, dmg: 4 * z.owner.power(), elem: z.elem, rain: true });
        }
      } else if (z.kind === 'planted') {
        // The lance shatters out of the ground.
        if (z.t + dt >= z.life && !z.shattered && z.owner.fxOk()) {
          z.shattered = true;
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * 6.283, up = 0.4 + Math.random() * 0.8, L = Math.hypot(1, up);
            sim.casting.burst(FX.BLADE, z.elem, z.x, z.y + 0.3, z.z, 0.04, 0.02, 0.4, { ax: Math.sin(a) / L, ay: up / L, az: Math.cos(a) / L, len: 0.25 + Math.random() * 0.2 });
          }
          sim.casting.burst(FX.FLARE, z.elem, z.x, z.y + 0.3, z.z, 0.2, 0.9, 0.2);
        }
      } else if (z.kind === 'song') {
        z.x = z.owner.x; z.z = z.owner.z;
        if (z.heal) for (const h of z.members) if (!h.dead) h.hp = Math.min(h.maxHp, h.hp + dt * 6);
      }
    }
    this.zones = this.zones.filter((z) => { const keep = z.t < z.life && !z.owner.dead && !z.done; if (!keep) z.end?.(z); return keep; });
  }

  // ---- killing, dying, coming back -----------------------------------------------------------------------------------

  onKill(h, m) {
    // (What your party kills is yours: its loot and its worth, as if your hand had done it. src/sim/sim.worker.js.)
    if (h.hired) { if (h.foe === m) h.foe = null; return; }
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
    if (h.hired) {
      h.foe = null; h.reviveT = 0;
      if (h.role === 'tank' && sim.warrens?.fight) sim.warrens.warn(14, 20);
      for (const o of [...this.company.members].filter((x) => !x.dead).slice(0, 1)) this.later(rand(0.6, 2), () => o.say(sim, 'ally_down', h.slot));
      return;
    }
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
      // (A Tripo monster's lair stands its dead again itself: src/sim/tripo.js TripoWorld.)
      if (m.lair) return false;
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
    if (h.broker) return this.atPost(h);
    if (h.hired) return this.companion(h, dt);
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
    if (h.foe && !h.swing && !h.jump && (h.rethinkT = (h.rethinkT || 0) - dt) <= 0) { h.rethinkT = 0.8 + (h.slot % 4) * 0.1; this.rethink(h); }
    if (h.foe) {
      // Too hurt and on their own: back to the town's ground, where nothing follows.
      if (h.hp < h.maxHp * 0.25 && !h.party && townDist(h.x, h.z) > 0) { h.foe = null; this.goHome(h, true); }
      if (h.talkUntil) h.talkUntil = 0;
      return;
    }
    // Stopped by the player for a word (E): stands where they are, square on to the player, until the talk ends,
    // the player walks off, or something needs killing.
    if (h.talkUntil) {
      if (sim.time > h.talkUntil || p.dead || h.near > 9) { h.talkUntil = 0; h.hold = 0.8; }
      else {
        h.goal = null; h.hold = Math.max(h.hold, 0.3);
        if (!h.sitting) h.holdFace = Math.atan2(p.x - h.x, p.z - h.z);
        return;
      }
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

  // A fight looked at again, a little under once a second: is this still the one to be on?
  //   Plate goes to whoever's in trouble: a lancer or a paladin turns onto whatever is on one of his own who's below half
  //   their life (you too, if you're near), and a lancer calls it onto himself.
  //   Anyone finishes what's nearly down beside them rather than leave it up.
  rethink(h) {
    const sim = this.sim, p = sim.player, m = h.foe, cls = h.person.cls;
    const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    if (cls === 'lancer' || cls === 'paladin') {
      const mine = h.party ? [...h.party.members] : [];
      if (!p.dead && near(p, h) < 18) mine.push(p);
      let worst = null, low = 0.5;
      for (const o of mine) if (o !== h && !o.dead && o.hp / o.maxHp < low) { low = o.hp / o.maxHp; worst = o; }
      if (worst) {
        const on = this.targets.find((k) => fightable(k) && k !== m && near(k, h) < 13 && (worst === p ? k.aggro && foeOf(k, sim) === p && near(k, p) < 6 : k.heroFoe === worst && sim.time - (k.heroFoeT ?? -9) < 4));
        if (on) {
          h.foe = on;
          if (cls === 'lancer') { on.tauntBy = h; on.tauntT = sim.time + 5; on.heroFoe = h; on.heroFoeT = sim.time; if (h.fxOk()) sim.casting.burst(FX.RING, ELEM.STORM, h.x, h.y + 0.1, h.z, 0.5, 5, 0.4); }
          return;
        }
      }
    }
    const mf = m.hp / (m.maxHp || m.hp || 1);
    if (mf > 0.5) {
      const weak = this.targets.find((k) => fightable(k) && k !== m && near(k, h) < (h.cls.ranged ? 12 : 3.5) && k.hp / (k.maxHp || k.hp || 1) < 0.2 && (!k.heroFoe || k.heroFoe === h || k.heroFoe.party === h.party));
      if (weak) h.foe = weak;
    }
  }

  care(h) {
    const sim = this.sim, p = sim.player;
    if (h.hired || h.broker) return;
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
        // (With a lute it's played, not only sung: the great wheeling strum for the war song, picking for the mending.)
        const tune = s.key === 'war_song' ? [2, ELEM.FIRE] : s.key === 'marching_song' ? [0, ELEM.STORM] : [1, ELEM.HEAL];
        if (h.luteP) h.playLute(s.travel ? 5 : 3.2, tune[0], { elem: tune[1] });
        h.startSwing(pick(GESTURES.sing), 1, [0.1], () => {
          const elem = s.key === 'war_song' ? ELEM.FIRE : s.key === 'marching_song' ? ELEM.STORM : ELEM.HEAL;
          this.zones.push({ kind: 'song', owner: h, members, x: h.x, z: h.z, t: 0, life: 6, elem, heal: s.heal });
          // (Added to what each already has: a war song on a shield wall is both.)
          if (s.key !== 'mending_song') for (const o of members) { o.buff = { ...(o.buff || {}), ...(s.key === 'war_song' ? { dmg: 1.25 } : { speed: 1.25 }) }; o.buffT = Math.max(o.buffT, 20); }
          if (Math.random() < 0.5) h.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf(s.key));
        }, { mask: 'upper', end: s.travel ? 0.7 : 0.2 });
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
      } else if (t.kind === 'perform' && t.began && h.gestureT <= 0) {
        // (A song at the well: sung, and played on the lute, a different way of playing each verse.)
        h.gesture_('sing', 8);
        if (h.luteP) h.playLute(8.5, (t.verse = (t.verse ?? h.slot) + 1) % 3, { elem: [ELEM.ARCANE, ELEM.HEAL, ELEM.LIGHT, ELEM.FROST][h.slot % 4], rainbow: t.verse % 3 === 2 });
      }
      else if (h.gestureT <= -rand(3, 10) && !h.sitting && Math.random() < dt * 0.15 * h.lean.show) h.gesture_(pick(['look', 'fold', 'warm', 'talk', 'proud']), rand(3, 6));
      // Wander within the place now and then.
      if (!h.sitting && t.kind !== 'perform' && h.gestureT <= 0 && Math.random() < dt * 0.04) h.goal = this.spotIn(t.place, h);
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
    // (Out of town: first to a point well inside its edge on the way, so they leave by the streets, not through the houses.)
    return townDist(place.spot[0], place.spot[1]) > 0 ? [[Math.sin(a) * 52, Math.cos(a) * 52], place.spot] : [place.spot];
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
      if (m) { h.goal = { x: m.x, z: m.z, speed: 1.8, stop: 6 }; if (!t.sighted?.has(m) && Math.random() < 0.5) { (t.sighted ||= new Set()).add(m); h.say(sim, MOBS[mobKind(m)]?.sight || 'mob_sighted', -1, PLACE_IDS.indexOf(t.place.id), MOB_KEYS.indexOf(mobKind(m))); } }
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
    if (dist > 2.2) h.goal = { x: other.x, z: other.z, speed: 1.8, stop: 1.8 };
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
    const edge = w.mode === 'edge' && townDist(p.x, p.z) > 0;
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

  // The player stops a hero to talk (E in src/main.js), or lets them go. A fight, a surf or a duel can't be stopped.
  talkTo(slot, on) {
    const h = this.heroes[slot];
    if (!h) return;
    if (!on) { if (h.talkUntil) { h.talkUntil = 0; h.hold = 0.8; } return; }
    if (!h.active || h.dead || h.foe || h.surf || h.jump || h.task?.kind === 'duel') return;
    h.talkUntil = this.sim.time + 90;
    h.goal = null;
    if (h.gesture && WHOLE_BODY.has(h.gesture) && h.gesture !== 'sit') { h.gesture = null; h.stopAction(0.3); }
  }

  // ---- the Free Company: the quartermasters, and the party you hire of them --------------------------------------------

  // Where a quartermaster's post is: his own (src/core/dungeon.js BROKER_SPOTS), or, while the Test Dungeon's on, his counter in
  // its hall (src/sim/testhall.js). [x, z, yaw or undefined]
  postOf(h) { return this.sim.testHall?.postOf(h.broker) || BROKER_SPOTS[h.broker]; }

  // A quartermaster keeps his post (in town, by the well; at the Warrens' portal) and turns to whoever comes to talk.
  atPost(h) {
    const sim = this.sim, p = sim.player, [x, z, face] = this.postOf(h);
    h.foe = null; h.task = { kind: 'town', place: null, t: 0, peace: true };
    if (Math.hypot(x - h.x, z - h.z) > 0.7) { h.goal = { x, z, speed: 1.6, stop: 0.4 }; return; }
    h.goal = null; h.hold = 0.3;
    const near = Math.hypot(p.x - h.x, p.z - h.z) < 7;
    h.holdFace = near ? Math.atan2(p.x - h.x, p.z - h.z) : face ?? (h.broker === 'portal' ? PORTAL.yaw + Math.PI : Math.PI);
    if (!near && !h.gesture && Math.random() < 0.002) h.gesture_(pick(['fold', 'look', 'talk']), 4);
  }

  // Hired: out of the world's day, into yours. A new name and a level near yours, from the quartermaster (src/ui/party.js).
  hire(slot, o) {
    const sim = this.sim, h = this.heroes[slot];
    if (!h || h.broker || h.hired || this.company.members.size >= 4) return false;
    if (h.party && h.party !== this.company) this.disband(h.party);
    h.walkWith = null; h.talkUntil = 0; h.task = { kind: 'help', t: 0 }; h.foe = null; h.goal = null; h.surf = null; h.below = 0; h.hidden = false;
    if (o.name) { h.person.name = o.name; h.person.full = o.name; h.person.guild = 'The Free Company'; }
    if (h.dead) this.revive(h, 1);
    h.hired = true; h.role = roleOf(h.person.cls);
    h.party = this.company; this.company.members.add(h);
    this.setLevel(h, o.level ?? h.person.level);
    h.hp = h.maxHp;
    // Up at your side, as if they'd been waiting for the word.
    if (!o.stay) this.bringTo(h);
    h.say(sim, 'player_joins_party');
    return true;
  }

  dismiss(slot) {
    const h = this.heroes[slot];
    if (!h || !h.hired) return;
    if (h.dead) this.revive(h, 1);
    h.hired = false; h.role = null; h.post = null;
    this.company.members.delete(h);
    h.baseLevel = Math.min(h.baseLevel ?? h.person.level, h.person.level);
    h.party = null; h.task = null; h.foe = null;
    if (h.surf?.free) { h.surf = null; h.stopAction(0.2); h.y = this.sim.world.height(h.x, h.z); }
    h.say(this.sim, 'player_party_end');
    // (Back to the town from wherever you left them; from the Warrens, out by the portal first.)
    if (inDungeon(h.x, h.z)) this.place(h, PORTAL.x + 3, PORTAL.z + 3);
    this.goHome(h);
  }

  // The other Tessariels keep pace with you: each is a few levels either side of yours (their own number, kept), and
  // never below where they began. Sent by the render thread when your level changes (src/ui/party.js). Your party's own
  // levels come by hireLevel.
  keepPace(level) {
    this.playerLevel = level;
    for (const h of this.heroes) {
      if (h.hired || h.broker) continue;
      h.baseLevel ??= h.person.level;
      const want = Math.max(h.baseLevel, Math.min(50, level + ((h.slot * 5) % 7) - 3));
      if (want !== h.person.level) { const up = want > h.person.level; this.setLevel(h, want); if (up && h.active && !h.dead && Math.random() < 0.25) h.say(this.sim, 'level_up'); }
    }
  }

  // A level for one of yours: their life and their blows go with it, and the moves they've come by (heroskills.js lvl).
  setLevel(h, level) {
    h.person.level = Math.max(1, Math.round(level));
    const was = h.maxHp || 1;
    h.maxHp = Math.round(h.cls.hp * (1 + 0.05 * (h.person.level - 1)));
    h.opts.hp = h.maxHp;
    h.hp = Math.min(h.maxHp, h.hp * h.maxHp / was);
    this.sim.event(EV.HERO_LEVEL, h.slot, h.person.level);
  }

  place(h, x, z, yaw = h.yaw) {
    const sim = this.sim;
    h.x = h.lastX = x; h.z = h.lastZ = z; h.y = sim.world.height(x, z); h.vx = h.vz = 0;
    h.yaw = h.faceYaw = yaw; h.goal = null; h.stuckT = 0; h.fieldAt = null;
  }

  // Next to the player, somewhere clear, with a puff: for one lost behind, or come through a portal.
  bringTo(h) {
    const sim = this.sim, p = sim.player, i = [...this.company.members].indexOf(h);
    if (!h.dead) this.puff(h.x, h.y + 1, h.z, ELEM.FROST);
    for (let t = 0; t < 10; t++) {
      const a = p.yaw + Math.PI + (i - 1.5) * 0.6 + t * 0.5, r = 2.6 + (t % 3) * 0.9;
      const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
      if (!sim.world.inside(x, z, 0.5)) { this.place(h, x, z, p.yaw); break; }
    }
    this.puff(h.x, h.y + 1, h.z, ELEM.FROST);
  }

  // Up again: at (x, z) if given, else where they fell, with frac of their life.
  revive(h, frac = 0.5, x, z) {
    const keep = { hired: h.hired, role: h.role, party: h.party, task: h.task, maxHp: h.maxHp, level: h.person.level };
    h.reset({ ...h.opts, spawn: [x ?? h.x, z ?? h.z] });
    h.heroReset();
    Object.assign(h, { hired: keep.hired, role: keep.role, party: keep.party, task: keep.task });
    h.person.level = keep.level;
    h.maxHp = keep.maxHp || h.maxHp;
    h.hp = h.maxHp * frac;
    h.y = this.sim.world.height(h.x, h.z);
    h.stopAction(0.01);
    this.sim.casting.burst(FX.COLUMN, ELEM.LIGHT, h.x, h.y, h.z, 0.5, 1, 0.8, { light: 10, lightR: 5, len: 2.5 });
  }

  // What's fighting you and yours: anything awake and at one of you, or that you've hit, within a stone's throw.
  companyFight() {
    const sim = this.sim, p = sim.player;
    if (this.fightTick === sim.tick) return this.fightList;
    const out = this.fightList || (this.fightList = []);
    out.length = 0;
    this.fightTick = sim.tick;
    for (const m of this.targets) {
      if (!fightable(m)) continue;
      const dp = Math.hypot(m.x - p.x, m.z - p.z);
      if (dp > 36) continue;
      const f = foeOf(m, sim);
      const onUs = m.aggro && (f === p || f.hired || (m.heroFoe?.hired && sim.time - (m.heroFoeT ?? -1e9) < 8));
      const hitByYou = sim.time - (m.playerHitT ?? -1e9) < 6;
      const boss = m.boss && m.aggro;
      if (onUs || hitByYou || boss) out.push(m);
    }
    return out;
  }

  // Each tick, for one of yours.
  companion(h, dt) {
    const sim = this.sim, p = sim.player, W = sim.warrens;
    const d = Math.hypot(h.x - p.x, h.z - p.z);
    const fight = this.companyFight();
    h.post = null;
    // A word with you: stand and listen, unless something needs killing.
    if (h.talkUntil && !fight.length) {
      if (sim.time > h.talkUntil || p.dead || h.near > 9) { h.talkUntil = 0; h.hold = 0.5; }
      else { h.goal = null; h.hold = Math.max(h.hold, 0.3); h.holdFace = Math.atan2(p.x - h.x, p.z - h.z); return; }
    }
    // Lost: through a portal without them, or left far behind out of a fight.
    if (!p.dead && !fight.length && !h.swing && (d > 60 || inDungeon(p.x, p.z) !== inDungeon(h.x, h.z))) { this.bringTo(h); return; }
    if (h.surf) return;
    // On the board when you are.
    if (p.surfing && !fight.length && Math.hypot(p.vx || 0, p.vz || 0) > 2.5 && !h.swing && !h.jump) { this.freeSurf(h); return; }
    // Out of whatever's marked on the ground under them (src/sim/perils.js), wherever they are: the circles, the strips, the
    // cones, the burning.
    const out = sim.perils.danger(h.x, h.z);
    if (out) { h.goal = { x: out[0], z: out[1], speed: 7.5, stop: 0.2 }; h.dodgeT = 0.35; if (h.role === 'heal') this.mend(h, true); return; }
    if (W?.inside) {
      // Behind a pillar while the dragon's on her perch, shooting what can be shot from there.
      const hide = W.hideFrom(h.x, h.z);
      if (hide) {
        h.foe = this.pickFoe(h, fight.filter((m) => !m.flying));
        const dh = Math.hypot(hide[0] - h.x, hide[1] - h.z);
        if (dh > 0.6 || !h.foe) { h.goal = { x: hide[0], z: hide[1], speed: 8, stop: 0.3 }; h.dodgeT = 0.25; }
        else h.post = hide;
        if (h.role === 'heal') this.mend(h, true);
        return;
      }
    }
    if (h.role === 'heal' && this.mend(h)) return;
    h.foe = this.pickFoe(h, fight);
    if (h.foe) { this.stance(h, h.foe, fight); this.fallBack(h, fight); return; }
    this.heel(h);
  }

  // One of yours, badly hurt, with something on them and the tank up: back behind him from it, where his taunt takes it
  // off them and the healer can reach them, fighting on from there. (The tank and the healer keep their own places.)
  fallBack(h, fight) {
    if (h.role !== 'dps' || h.post || h.hp > h.maxHp * 0.35) return;
    const sim = this.sim, tank = [...this.company.members].find((o) => o.role === 'tank' && !o.dead && o.hp > o.maxHp * 0.25);
    if (!tank) return;
    const on = fight.find((m) => foeOf(m, sim) === h && Math.hypot(m.x - h.x, m.z - h.z) < 6);
    if (!on) return;
    const dx = tank.x - on.x, dz = tank.z - on.z, L = Math.hypot(dx, dz) || 1;
    const x = tank.x + dx / L * 3, z = tank.z + dz / L * 3;
    if (!sim.world.inside(x, z, 0.5)) h.post = [x, z];
  }

  // Whom to go for. The tank: whatever's loose on the rest of you, then what he has. Everyone else: the fight's adds first
  // (diggers, whelps), then what the tank's holding, then what you're on.
  pickFoe(h, fight) {
    const sim = this.sim, p = sim.player;
    if (!fight.length) return null;
    const near = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
    const by = (list, from) => { let best = null, bd = Infinity; for (const m of list) { const d = near(m, from); if (d < bd) { bd = d; best = m; } } return best; };
    if (h.role === 'tank') {
      const loose = fight.filter((m) => foeOf(m, sim) !== h && !m.flying);
      // (A taunt for what's loose near him: everything within eleven metres turns on him.)
      if (loose.length && h.tauntCd <= 0 && !h.dead) {
        const close = loose.filter((m) => near(m, h) < 11);
        if (close.length) {
          h.tauntCd = 7;
          for (const m of close) { m.tauntBy = h; m.tauntT = sim.time + 6; m.heroFoe = h; m.heroFoeT = sim.time; }
          if (h.fxOk()) sim.casting.burst(FX.RING, ELEM.STORM, h.x, h.y + 0.1, h.z, 0.5, 10, 0.5, { light: 8, lightR: 6 });
          sim.event(EV.ROAR, h.x, h.y + 1.6, h.z, 0.6);
          if (Math.random() < 0.3) h.say(sim, 'class_skill', -1, -1, -1, MOVE_KEYS.indexOf('shield_wall'));
        }
      }
      const healer = [...this.company.members].find((o) => o.role === 'heal' && !o.dead) || p;
      if (loose.length) return by(loose, healer);
      if (h.foe && fight.includes(h.foe)) return h.foe;
      return by(fight.filter((m) => !m.flying), h) || by(fight, h);
    }
    const adds = fight.filter((m) => m.lair?.add);
    if (adds.length) return by(adds, h);
    const tank = [...this.company.members].find((o) => o.role === 'tank' && !o.dead);
    if (tank?.foe && fight.includes(tank.foe) && !tank.foe.flying) return tank.foe;
    const mine = fight.filter((m) => sim.time - (m.playerHitT ?? -1e9) < 4);
    if (mine.length) return by(mine, p);
    if (h.foe && fight.includes(h.foe)) return h.foe;
    return by(fight, p);
  }

  // Where to fight from, if it matters: the healer back from the tank, a dragon's flanks, out of a twin's whirlwind.
  stance(h, m) {
    const p = this.sim.player;
    const away = (from, r) => { const dx = h.x - from.x, dz = h.z - from.z, L = Math.hypot(dx, dz) || 1; return [from.x + dx / L * r, from.z + dz / L * r]; };
    if (m.spin > 0 && Math.hypot(h.x - m.x, h.z - m.z) < 7.5) { h.post = away(m, 7.5); return; }
    if (m.bossKey === 'venomaw' && !m.flying && h.role !== 'tank') {
      // At her side: the side of her nearer to them, past her girth, farther off for those who shoot.
      const rx = Math.cos(m.yaw), rz = -Math.sin(m.yaw), side = (h.x - m.x) * rx + (h.z - m.z) * rz >= 0 ? 1 : -1;
      const far = h.cls.ranged || h.role === 'heal';
      const r = far ? 11 : radiusOf(m) + 1.1, fwd = far ? -1.5 : -0.6;
      h.post = [m.x + rx * side * r + Math.sin(m.yaw) * fwd, m.z + rz * side * r + Math.cos(m.yaw) * fwd];
      return;
    }
    if (h.role === 'heal') {
      const tank = [...this.company.members].find((o) => o.role === 'tank' && !o.dead) || p;
      const from = Math.hypot(tank.x - m.x, tank.z - m.z) < 6 ? tank : m;
      h.post = away(from, 9);
    }
  }

  // The healer's work: the lowest of you, by need, with the quick light or the great one. True if it's casting.
  mend(h, moving = false) {
    const sim = this.sim, p = sim.player;
    if (h.swing || h.dead) return !!h.swing;
    let who = null, need = 0;
    for (const o of [p, ...this.company.members]) {
      if (o.dead) continue;
      const want = (o.role === 'tank' ? 0.85 : 0.75) - o.hp / o.maxHp;
      if (want > need) { need = want; who = o; }
    }
    if (!who) return false;
    const d = Math.hypot(who.x - h.x, who.z - h.z);
    const big = who.hp / who.maxHp < 0.45 && h.bigHealCd <= 0;
    if (!big && h.healCd > 0) return false;
    if (d > 24 || !sim.world.sees(h.x, h.y + 1.6, h.z, who.x, who.y + 1.2, who.z)) {
      if (moving) return false;
      h.goal = { x: who.x, z: who.z, speed: 7, stop: 12 };
      return true;
    }
    const lvl = 1 + h.person.level * 0.04;
    if (big) h.bigHealCd = 7; else h.healCd = 1.8;
    h.yaw = h.faceYaw = Math.atan2(who.x - h.x, who.z - h.z);
    h.startSwing('Spell_Simple_Shoot', big ? 1.0 : 1.5, [0.45], () => {
      if (who.dead) return;
      const amt = (big ? 0.38 : 0.15) * who.maxHp + (big ? 14 : 7) * lvl;
      who.hp = Math.min(who.maxHp, who.hp + amt);
      sim.casting.burst(FX.COLUMN, ELEM.LIGHT, who.x, who.y, who.z, 0.6, 1.1, big ? 1.1 : 0.7, { light: big ? 14 : 8, lightR: 6, len: 3 });
      sim.casting.burst(FX.RING, ELEM.LIGHT, who.x, who.y + 0.05, who.z, 0.3, 1.3, 0.6);
      if (who === p && Math.random() < 0.25) h.say(sim, 'player_heal');
    }, { still: !moving, mask: 'upper' });
    return true;
  }

  // Out of a fight: at heel, along the way you came, a few strides back and a little to the side; round you when you stop.
  heel(h) {
    const sim = this.sim, p = sim.player, i = [...this.company.members].indexOf(h);
    const pv = Math.hypot(p.vx || 0, p.vz || 0);
    let x, z;
    if (pv > 0.6 && this.trail.length > 2) {
      // Back along the trail so far, then out to the side.
      let want = 2.6 + i * 1.6, ax = p.x, az = p.z, k = this.trail.length - 1;
      while (k >= 0) {
        const bx = this.trail[k][0], bz = this.trail[k][1], L = Math.hypot(bx - ax, bz - az);
        if (L >= want) { ax += (bx - ax) * want / L; az += (bz - az) * want / L; want = 0; break; }
        want -= L; ax = bx; az = bz; k--;
      }
      const ux = p.vx / pv, uz = p.vz / pv, side = (i % 2 ? 1 : -1) * 0.9;
      x = ax + uz * side; z = az - ux * side;
    } else {
      const a = p.yaw + Math.PI + (i - 1.5) * 0.55, r = 2.8 + (i % 2) * 0.6;
      x = p.x + Math.sin(a) * r; z = p.z + Math.cos(a) * r;
    }
    const far = Math.hypot(x - h.x, z - h.z);
    h.goal = { x, z, speed: far > 9 ? Math.max(9.8, pv * 1.25) : far > 3 ? Math.max(2.2, pv * 1.15) : Math.max(1.3, pv), stop: 0.7, face: pv > 0.6 ? Math.atan2(p.vx, p.vz) : p.yaw };
    if (h.sitting) { h.sitting = false; h.stopAction(0.3); }
  }

  freeSurf(h) {
    const i = [...this.company.members].indexOf(h), p = this.sim.player;
    h.surf = { free: true, i, v: Math.hypot(p.vx || 0, p.vz || 0), foot: i % 2 ? 1 : -1, travel: h.yaw, off: 0, hitSet: new Set() };
    h.goal = null; h.foe = null;
    if (h.gesture) { h.gesture = null; }
    this.sim.event(EV.JUMP, h.x, h.y, h.z);
  }

  // The player's way, kept for the party to follow round corners; and getting the fallen up once a fight's done.
  stepCompany(dt) {
    const sim = this.sim, p = sim.player, t = this.trail;
    const last = t[t.length - 1];
    if (!last || Math.hypot(p.x - last[0], p.z - last[1]) > 25) { t.length = 0; t.push([p.x, p.z]); }
    else if (Math.hypot(p.x - last[0], p.z - last[1]) > 0.8) { t.push([p.x, p.z]); if (t.length > 60) t.shift(); }
    if (!this.company.members.size) return;
    const fighting = this.companyFight().length > 0 || !!sim.warrens?.fight;
    for (const h of this.company.members) {
      if (!h.dead) continue;
      h.reviveT = fighting || p.dead ? 0 : h.reviveT + dt;
      if (h.reviveT > 4) { this.revive(h, 0.5); h.say(sim, 'hero_return'); }
    }
  }

  // Keep the town's hours with the render thread's clock (it owns the sun).
  setHour(h) { this.hour = h; }

  // Review commands from the render thread (bm.heroes in src/main.js), for staging a scene and reading what everyone's doing.
  debug(m) {
    const sim = this.sim, p = sim.player, hs = m.slot === undefined || m.slot < 0 ? this.heroes : [this.heroes[m.slot]].filter(Boolean);
    const place = (h, x, z) => { h.x = h.lastX = x; h.z = h.lastZ = z; h.y = sim.world.height(x, z); h.vx = h.vz = 0; h.goal = null; };
    switch (m.cmd) {
      case 'near': hs.forEach((h, i) => { const a = p.yaw + (i - (hs.length - 1) / 2) * Math.min(0.35, 1.7 / Math.max(1, hs.length - 1)); place(h, p.x + Math.sin(a) * (m.r || 7), p.z + Math.cos(a) * (m.r || 7)); h.yaw = h.faceYaw = Math.atan2(p.x - h.x, p.z - h.z); }); break;
      case 'at': hs.forEach((h, i) => place(h, m.x + (i % 4) * 1.6, m.z + Math.floor(i / 4) * 1.6)); break;
      case 'task': hs.forEach((h) => { if (h.party) this.disband(h.party); h.task = null; h.foe = null; if (h.sitting) { h.sitting = false; h.stopAction(0.2); } if (['hunt', 'delve', 'summit'].includes(m.kind)) this.plan(h, m.kind); }); break;
      case 'surf': hs.forEach((h, i) => { const top = THE_FALL.line[THE_FALL.line.length - 1]; place(h, top[0], top[1]); this.startSurf(h, i, hs.length > 1); }); break;
      case 'gesture': hs.forEach((h) => h.gesture_(m.name, m.seconds)); break;
      // (A bard at the lute: tune({ slot, v: 0-2, seconds }). A level for anyone: level({ slot, level }).)
      case 'tune': hs.forEach((h) => h.playLute(m.seconds ?? 6, m.v ?? 0, { elem: m.elem, rainbow: m.rainbow, bare: !!m.bare })); break;   // (bare: the hands alone, nothing thrown off the strings)
      case 'level': hs.forEach((h) => this.setLevel(h, m.level ?? 20)); break;
      case 'ready': hs.forEach((h) => { for (const q of h.skills) q.t = 0; h.gcd = 0; }); break;
      // (mute: nothing of its own accord but its ordinary blows, so one move can be looked at alone. still: not even those.)
      case 'mute': hs.forEach((h) => { for (const q of h.skills) q.t = 1e9; h.gcd = 1e9; h.orbitCd = 1e9; h.tumbleCd = 1e9; if (m.still) h.shotCd = 1e9; }); break;
      case 'face': hs.forEach((h) => { h.yaw = h.faceYaw = m.yaw ?? 0; }); break;
      // (Whatever's still in the air or on the ground from the last thing looked at, gone.)
      case 'clear': for (const z of this.zones) z.end?.(z); this.zones = []; for (const q of this.shots) q.end?.(q); this.shots = []; this.dots = []; this.timers = []; sim.casting.bursts = []; break;
      // (And the dead that were stood up for it, put well away and after no one, so none wanders off to find you.)
      case 'sweep': for (const k of sim.knights) if (k instanceof Zombie && !k.dormant && Math.hypot(k.x - p.x, k.z - p.z) < 140) { k.x += 600; k.z += 600; k.y = sim.world.height(k.x, k.z); k.aggro = false; k.heroFoe = null; k.tauntBy = null; } break;
      // (Set on whatever's nearest, to fight it as it would.)
      case 'attack': hs.forEach((h) => { const f = this.targets.filter(fightable).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; if (f) { h.foe = f; h.hold = 0; h.shotCd = 0; } }); break;
      // (Something to hit, for looking at a move: n of the plain dead up out of the ground at a point, standing, after no one.)
      case 'dummies': {
        const n = m.n || 3, near = (k) => Math.hypot(k.x - m.x, k.z - m.z);
        const pool = sim.knights.filter((k) => k instanceof Zombie && !k.opts.role && !k.opts.reserve && k.opts.model !== 'zombie_ogre' && !k.boss).sort((u, v) => near(u) - near(v)).slice(0, n);
        // (Anything else of theirs standing about is put well away, so only these are in the picture.)
        for (const k of sim.knights) if (k instanceof Zombie && !pool.includes(k) && !k.dormant && near(k) < 60) { k.x += 600; k.z += 600; k.aggro = false; }
        pool.forEach((k, i) => { const a = i * 2.4, r = i ? 1.2 + 0.4 * Math.floor((i - 1) / 3) : 0; k.raiseAt(sim, m.x + Math.sin(a) * r, m.z + Math.cos(a) * r, null, true); k.heroFoe = null; k.tauntBy = null; });
        break;
      }
      // (A clip held at a point in it, for looking a body over: pose({ slot, clip, at: 0-1 }); clip null lets go.)
      case 'pose': hs.forEach((h) => {
        const c = m.clip && h.bank.clips[m.clip];
        if (!c) { h.gesture = null; h.stopAction(0.1); return; }
        h.play(m.clip, 0, 'full', 0); h.actT = (m.at ?? 0.5) * c.dur; h.gesture = 'review'; h.gestureT = 1e9;
      }); break;
      case 'skill': hs.forEach((h) => { const f = this.targets.filter(fightable).sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; if (f) { h.foe = f; h.skill(sim, m.key, f); } }); break;
      // A staged fight: the nearest living monster (of kind m.mob, if given) to the player, with these heroes around it.
      case 'fight': {
        const f = this.targets.filter((t) => fightable(t) && !t.dead && (!m.mob || mobKind(t) === m.mob)).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (!f) break;
        hs.forEach((h, i) => { const a = (i / hs.length) * Math.PI * 2; place(h, f.x + Math.sin(a) * (m.r || 7), f.z + Math.cos(a) * (m.r || 7)); h.hold = 0; h.foe = f; h.yaw = h.faceYaw = Math.atan2(f.x - h.x, f.z - h.z); });
        break;
      }
      case 'freeze': hs.forEach((h) => { h.hold = m.seconds ?? 1e9; h.holdFace = m.face; }); break;
      // (For staging a fight in the open for a screenshot: the nearest standing dead brought to a point.)
      case 'pull': {
        // (rise: up out of the ground there instead, the way they come into the world. Calm: no one to go after.)
        const n = m.n || 1;
        const z = m.rise ? [] : sim.knights.filter((k) => k instanceof Zombie && fightable(k) && !k.crawling).sort((u, v) => Math.hypot(u.x - p.x, u.z - p.z) - Math.hypot(v.x - p.x, v.z - p.z)).slice(0, n);
        z.forEach((k, i) => { k.x = m.x + (i % 3) * 1.6; k.z = m.z + Math.floor(i / 3) * 1.6; k.y = sim.world.height(k.x, k.z); });
        sim.knights.filter((k) => k instanceof Zombie && k.dormant && !k.opts.role && !k.opts.reserve && k.opts.model !== 'zombie_ogre').slice(0, n - z.length)
          .forEach((k, j) => { const i = z.length + j; k.raiseAt(sim, m.x + (i % 3) * 1.6, m.z + Math.floor(i / 3) * 1.6, null, !!m.calm); });
        break;
      }
      case 'undead': self.postMessage({ type: 'heroState', id: m.id, heroes: [], undead: sim.knights.filter((k) => k instanceof Zombie).map((k) => ({ id: k.id, model: k.opts.model, role: k.opts.role || null, x: +k.x.toFixed(1), z: +k.z.toFixed(1), sink: +k.sink.toFixed(2), state: k.state, dead: k.dead, dormant: k.dormant, grave: k.opts.grave || null, up: k.graveUp, aggro: k.aggro, clip: k.clip })), others: sim.knights.filter((k) => !(k instanceof Zombie)).map((k) => ({ id: k.id, kind: k.kind, name: k.opts?.name || k.constructor.name, x: +k.x.toFixed(0), z: +k.z.toFixed(0) })) }); break;
      case 'dump': self.postMessage({ type: 'heroState', id: m.id, heroes: this.heroes.map((h) => ({ slot: h.slot, name: h.person.name, cls: h.person.cls, x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), yaw: +h.yaw.toFixed(2), hp: Math.round(h.hp), task: h.task?.kind || null, there: !!h.task?.there, party: h.party?.id ?? null, foe: h.foe ? mobKind(h.foe) : null, foeAt: h.foe ? [+h.foe.x.toFixed(1), +(h.foe.y || 0).toFixed(1), +h.foe.z.toFixed(1)] : null, dead: h.dead, below: h.below > 0, surf: !!h.surf, kills: h.kills, bag: h.bag, level: h.person.level, near: Math.round(h.near || 0), action: h.action?.name || null, goal: h.goal ? [Math.round(h.goal.x), Math.round(h.goal.z)] : null, leg: h.task?.leg ?? null, legs: h.task?.path?.length ?? null, tt: Math.round(h.task?.t || 0), place: h.task?.place?.id || null, spd: +Math.hypot(h.vx || 0, h.vz || 0).toFixed(1), follow: h.party?.leader && h.party.leader !== h ? h.party.leader.slot : null, hired: !!h.hired, walk: h.walkWith?.mode || null, hold: +Math.max(0, h.hold).toFixed(1), sit: h.sitting, leaps: h.leaps, guard: h.guardT > 0, iframes: h.iframesT > 0, charge: !!h.charge, jump: !!h.jump, flight: h.flight?.length || 0 })), zones: this.zones.map((z) => z.kind), shots: this.shots.map((q) => q.kind + (q.rain ? ':rain' : q.up ? ':up' : '')), dots: this.dots.length }); break;
      default: break;
    }
  }
}

// (What src/sim/heroskills.js needs of this file, handed over once both are loaded.)
install({ fightable, radiusOf, Zombie, Caster, Gravehart, Knight, LEAPS, LINE_SKILLS });
