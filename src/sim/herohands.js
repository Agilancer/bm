// The heroes' hands: what every finger and the thumb are doing, every pose, worked out last (Hero.poseHands), after the arms
// have put each hand where it's going.
//
// A hero's hand is modelled flat and open (the armour's sculpt), and the clips' fingers are another skeleton's (the
// library's clenched fists, the Lisandra clips' none at all): left as they were, every hand that held nothing was a flat
// blade, a "karate chop", whatever it was doing. So a hand is a shape here, made from the modelled hand:
//   - each finger's three joints turned in toward the palm, knuckle to tip (a finger bends most at its middle joint, and
//     the little finger more than the index, so a hand at rest is a cascade, not a row);
//   - each finger turned out from the middle one (spread) or in to it;
//   - the thumb: swung round under the palm (opp), in toward the fingers (add), and bent at its two joints.
// Shapes are mixed by what the body is doing: at rest a relaxed hand; running a loose fist; whatever it holds, a grip round
// that; in a gesture the hand the gesture wants (an open hand to wave, a finger to point, two hands flat to clap, fists to
// cheer); and an open hand opens further the faster it moves, as a hand does when someone talks with it. Each finger
// follows at its own rate (the index first, the little finger last), and none of them is ever quite still.
//
// Angles in radians, from the modelled hand. The thumbs' are fitted (tools/build/h3/thumbfit.mjs) on six bodies' hands so
// the tip lands where a real one does: in a fist across the index and middle fingers' middle bones, outside them.

// One shape: c (curl, per finger [index, middle, ring, pinky], per joint knuckle to tip), sp (spread, per finger, + away
// from the middle finger), th ([opp, add, bend at the second joint, at the tip]).
const S = (c, sp, th) => ({ c, sp, th });
export const SHAPES = {
  // Let fall at the side: the fingers lightly curled, more toward the little finger; the thumb resting along the index.
  relax: S([[0.2, 0.32, 0.2], [0.28, 0.4, 0.24], [0.36, 0.46, 0.27], [0.44, 0.5, 0.3]], [0.05, 0, -0.05, -0.1], [0.1, 0.5, 0.15, 0.15]),
  // Open: a hand that's showing, waving or reaching; the fingers nearly straight and a little apart, the thumb out.
  open: S([[0.06, 0.1, 0.05], [0.08, 0.12, 0.06], [0.1, 0.14, 0.07], [0.12, 0.16, 0.08]], [0.12, 0.02, -0.1, -0.2], [0.18, -0.05, 0.08, 0.06]),
  // Flat: two hands clapping, a palm pressed out; straight and together.
  flat: S([[0.02, 0.04, 0.02], [0.02, 0.04, 0.02], [0.03, 0.05, 0.03], [0.04, 0.06, 0.03]], [-0.04, 0, 0.03, 0.04], [0.3, 0.2, 0.05, 0.04]),
  // A loose fist, running: shut but not clenched, the thumb across the index finger's middle bone.
  fist: S([[1.05, 1.15, 0.7], [1.12, 1.2, 0.72], [1.18, 1.22, 0.74], [1.24, 1.22, 0.75]], [0, 0, 0, -0.04], [1.49, 0.8, 0.6, 0.46]),
  // A fist clenched to strike or to cheer: tight, the thumb over the first two fingers.
  clench: S([[1.35, 1.5, 0.9], [1.4, 1.52, 0.92], [1.45, 1.52, 0.92], [1.5, 1.5, 0.92]], [-0.02, 0, 0.02, 0.02], [1.14, -0.31, 0.31, 1.02]),
  // Round a haft: the fingers wrapped (less at the tips than a fist: the haft is between them and the palm), the thumb
  // round the other side of it and onto the index.
  grip: S([[0.95, 1.2, 0.75], [1.0, 1.22, 0.75], [1.05, 1.22, 0.75], [1.12, 1.2, 0.75]], [0.02, 0, -0.02, -0.04], [1.59, 0.8, 0.56, 0.4]),
  // Pointing: the index out, the rest shut, the thumb over the middle finger.
  point: S([[0.04, 0.06, 0.03], [1.25, 1.4, 0.85], [1.3, 1.42, 0.85], [1.35, 1.4, 0.85]], [0.04, 0, 0, 0], [1.39, 0.19, 0.05, 0.91]),
  // A claw: a spell in the hand, fingers bent and spread, the thumb opposed to them.
  claw: S([[0.4, 0.62, 0.5], [0.42, 0.66, 0.52], [0.45, 0.68, 0.54], [0.5, 0.68, 0.55]], [0.16, 0.03, -0.12, -0.24], [0.7, 0.1, 0.35, 0.3]),
  // On the bowstring (three under the nock, hooked at the middle joints), the little finger and the thumb tucked.
  hook: S([[0.35, 1.15, 0.75], [0.35, 1.2, 0.78], [0.4, 1.15, 0.72], [1.1, 1.2, 0.8]], [0.02, 0, -0.02, -0.06], [0.1, 0.5, 0.15, 0.12]),
  // On a lute's neck: fingers arched down onto the strings, the thumb behind the neck.
  // (Bent well over: nearer straight, the fretting hand lay beside the neck like a rake, the critics' second review.)
  chord: S([[0.78, 1.12, 0.66], [0.92, 1.16, 0.62], [0.96, 1.1, 0.56], [0.86, 1.0, 0.5]], [0.1, 0.02, -0.06, -0.14], [0.9, 0.2, 0.25, 0.2]),
  // Holding a pick: the thumb and the bent index together, the others easy.
  pick: S([[0.85, 1.05, 0.6], [0.7, 0.86, 0.5], [0.78, 0.9, 0.52], [0.85, 0.92, 0.54]], [0, 0.04, 0, -0.06], [1.66, 0.95, 0.85, 0.04]),
  // A hand gone slack (a fall, the dead): looser than at rest.
  limp: S([[0.3, 0.42, 0.28], [0.36, 0.48, 0.3], [0.42, 0.5, 0.32], [0.48, 0.52, 0.34]], [0.02, 0, -0.03, -0.06], [0.3, 0.1, 0.25, 0.25]),
};
export const SHAPE_KEYS = Object.keys(SHAPES);

// What each clip wants of each hand: [left, right] (a shape's name, or null for the hand at rest). A clip not here has
// relaxed hands, opened by how fast they move.
const both = (s) => [s, s];
export const CLIP_HANDS = {
  // Gestures.
  LP_wave_goodbye_01: ['relax', 'open'], LP_wave_goodbye_02: ['relax', 'open'], LP_greet_01: ['relax', 'open'], LP_greet_02: ['relax', 'open'], LP_greet_03: both('open'), LP_greet_04: ['relax', 'open'],
  LP_bow: both('relax'), LP_cheer: both('clench'), LP_clap: both('flat'), LP_laugh_01: both('open'), LP_laugh_02: both('open'),
  LP_Pointing_into_the_distance: ['relax', 'point'], LP_Pointing_at_an_enemy: ['relax', 'point'], L_Point: ['relax', 'point'],
  LP_angry_01: both('clench'), LP_angry_02: both('clench'), LP_angry_03: both('clench'), LP_Talking_to_someone_angrily: both('open'), L_Angry: both('clench'),
  LP_complain_01: both('open'), LP_complain_02: both('open'), LP_frustrated_01: both('claw'), LP_frustrated_02: both('claw'),
  LP_dance_01: both('open'), LP_dance_02: both('open'), LP_dance_03: both('open'), LP_dance_04: both('open'), LP_dance_05: both('open'), LP_dance_06: both('open'), Dance_Loop: both('open'),
  LP_sing_01: both('open'), LP_sing_02: both('open'), LP_sing_03: both('open'), LP_sing_04: both('open'),
  LP_fold_arms: both('relax'), Idle_FoldArms_Loop: both('relax'), LP_look_around: both('relax'), LP_cry: both('claw'), LP_sob: both('claw'), LP_hug: both('open'),
  Yes: both('relax'), LP_agree: both('relax'), Idle_No_Loop: both('relax'), Fixing_Kneeling: both('grip'), Idle_Talking_Loop: both('open'), Sitting_Talking_Loop: both('open'),
  LP_scared_01: both('claw'), LP_scared_02: both('claw'), LP_frightened: both('claw'), LP_afraid: both('claw'),
  LP_heart_pose: both('open'), LP_swagger: both('clench'), LP_defeat_02: both('limp'), LP_defeat_03: both('limp'), LP_warm_up: both('clench'), LP_depressed: both('limp'),
  Sitting_Idle_Loop: both('relax'), LP_sit: both('relax'), LP_wait: both('relax'), LP_standing_relax: both('relax'), LP_idle: both('relax'),
  // Fights, falls and work.
  Punch_Cross: both('clench'), Punch_Jab: both('clench'), Melee_Hook: both('clench'), Melee_Hook_Rec: both('clench'), LP_box_01: both('clench'), LP_box_02: both('clench'), LP_box_03: both('clench'),
  L_SnapKick: both('clench'), LP_front_kick_01: both('clench'), LP_front_kick_02: both('clench'), L_Pounce: both('claw'), LP_Pounce_on_an_enemy_violently: both('claw'),
  Spell_Simple_Enter: ['relax', 'claw'], Spell_Simple_Idle_Loop: ['relax', 'claw'], Spell_Simple_Shoot: ['relax', 'open'], Spell_Simple_Exit: ['relax', 'claw'], LP_cast_a_spell: both('claw'), LP_2_handed_fancy_spell_casting: both('claw'),
  OverhandThrow: ['open', 'grip'], Roll: both('fist'), Hit_Chest: both('open'), Hit_Head: both('open'), Hit_Knockback: both('open'), L_HitHead: both('open'), L_HitBody: both('open'), L_HitGut: both('claw'),
  LP_hit_to_body_01: both('open'), LP_hit_to_body_02: both('open'), LP_hit_to_head: both('open'), LP_hit_to_side: both('open'), LP_hit_to_stomach: both('claw'),
  Death01: both('limp'), LayToIdle: both('limp'), LP_fall: both('open'), Jump_Start: both('fist'), Jump_Loop: both('relax'), Jump_Land: both('open'), LP_jump: both('fist'), LP_flip: both('fist'), LP_dive: both('open'),
  Interact: ['relax', 'grip'], PickUp_Table: ['relax', 'grip'], Chest_Open: both('grip'), ClimbUp_1m: both('grip'), LP_climb: both('grip'), LP_Climbing: both('grip'), Push_Loop: both('flat'),
  LP_lift_heavy: both('grip'), LP_dig: both('grip'), LP_shovel: both('grip'), Farm_Harvest: both('grip'), Farm_PlantSeed: ['relax', 'pick'], Farm_Watering: ['relax', 'grip'],
  Shield_Dash: ['grip', 'grip'], Shield_OneShot: ['grip', 'grip'], Idle_Shield_Break: ['open', 'grip'],
};

// How fast each finger follows (1/s: index first, the little finger last) and the thumb.
const RATE = [16, 13.5, 11.5, 10], THUMB_RATE = 12;
const N = 4 * 3 + 4 + 4;               // a hand's numbers: 12 curls, 4 spreads, 4 for the thumb

// A hand's own numbers: where its fingers are (cur) and are going (want); what the pose asked of it this time (req: shapes
// and how much); how fast it's moving against the hips (speed), from where it was (prev).
export function handState() { return { cur: new Float32Array(N), want: new Float32Array(N), started: false, speed: 0, prev: [0, 0, 0], had: false, reqN: 0, reqS: [], reqK: [] }; }

// The shape a hand is aiming at, as numbers: start from one (setShape), then move toward others by how much each is wanted
// (mixShape), in order, so what comes last has the last word.
export function setShape(out, name) {
  const s = SHAPES[name] || SHAPES.relax;
  for (let f = 0; f < 4; f++) { for (let j = 0; j < 3; j++) out[f * 3 + j] = s.c[f][j]; out[12 + f] = s.sp[f]; }
  for (let t = 0; t < 4; t++) out[16 + t] = s.th[t];
  return out;
}

export function mixShape(out, name, w) {
  if (!(w > 0.001)) return out;
  const s = SHAPES[name]; if (!s) return out;
  const k = Math.min(1, w);
  for (let f = 0; f < 4; f++) {
    for (let j = 0; j < 3; j++) out[f * 3 + j] += (s.c[f][j] - out[f * 3 + j]) * k;
    out[12 + f] += (s.sp[f] - out[12 + f]) * k;
  }
  for (let t = 0; t < 4; t++) out[16 + t] += (s.th[t] - out[16 + t]) * k;
  return out;
}

// Each finger after its own aim, at its own rate.
export function follow(H, dt) {
  const { cur, want } = H;
  if (!H.started) { cur.set(want); H.started = true; }
  for (let f = 0; f < 4; f++) {
    const k = 1 - Math.exp(-RATE[f] * dt);
    for (let j = 0; j < 3; j++) cur[f * 3 + j] += (want[f * 3 + j] - cur[f * 3 + j]) * k;
    cur[12 + f] += (want[12 + f] - cur[12 + f]) * k;
  }
  const kt = 1 - Math.exp(-THUMB_RATE * dt);
  for (let t = 0; t < 4; t++) cur[16 + t] += (want[16 + t] - cur[16 + t]) * kt;
  return cur;
}

// A slow drift at each knuckle, out of step with the others, so a hand's never quite still (rad; time: seconds, seed: the
// hand's own; life: 0 for a hand shut on something).
export function drift(f, time, seed, life) {
  if (!(life > 0.001)) return 0;
  return (Math.sin(time * (0.7 + f * 0.13) + seed * 1.7 + f * 2.1) * 0.6 + Math.sin(time * (0.29 + f * 0.07) + seed + f) * 0.4) * 0.05 * life;
}
