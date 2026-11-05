// How a body on the UAL skeleton comes apart, for the sim and the renderer alike. A part is a run of joints between two cuts.
export const PART = { TORSO: 0, HIPS: 1, HEAD: 2, UPPER_L: 3, FORE_L: 4, HAND_L: 5, UPPER_R: 6, FORE_R: 7, HAND_R: 8, THIGH_L: 9, SHIN_L: 10, FOOT_L: 11, THIGH_R: 12, SHIN_R: 13, FOOT_R: 14 };
const P = PART;

// The part each comes off with: what's nearer the chest keeps its place on the skeleton, and the hips go as one, legs and all.
export const CHILDREN = {
  [P.TORSO]: [P.HEAD, P.UPPER_L, P.UPPER_R, P.HIPS], [P.HIPS]: [P.THIGH_L, P.THIGH_R],
  [P.UPPER_L]: [P.FORE_L], [P.FORE_L]: [P.HAND_L], [P.UPPER_R]: [P.FORE_R], [P.FORE_R]: [P.HAND_R],
  [P.THIGH_L]: [P.SHIN_L], [P.SHIN_L]: [P.FOOT_L], [P.THIGH_R]: [P.SHIN_R], [P.SHIN_R]: [P.FOOT_R],
};

export function partOfJoint(name) {
  const side = name.endsWith('_l') ? 'L' : name.endsWith('_r') ? 'R' : '';
  if (name === 'root' || name === 'pelvis') return P.HIPS;
  if (name === 'Head') return P.HEAD;
  if (name.startsWith('spine') || name.startsWith('neck') || name.startsWith('clavicle')) return P.TORSO;
  if (name.startsWith('upperarm')) return P[`UPPER_${side}`];
  if (name.startsWith('lowerarm')) return P[`FORE_${side}`];
  if (name.startsWith('thigh')) return P[`THIGH_${side}`];
  if (name.startsWith('calf')) return P[`SHIN_${side}`];
  if (name.startsWith('foot') || name.startsWith('ball')) return P[`FOOT_${side}`];
  if (side) return P[`HAND_${side}`]; // the hand and its fingers
  return P.TORSO;
}

// Where the renderer puts a stump. near stays with partNear, far with partFar, and the disc lies across the line along[0] to along[1].
const limb = (near, far, partNear, partFar, next) => ({ near, far, partNear, partFar, along: [far, next] });
export const CUTS = [
  { near: 'neck_01', far: 'Head', partNear: P.TORSO, partFar: P.HEAD, along: ['neck_01', 'Head'] },
  { near: 'spine_01', far: 'pelvis', partNear: P.TORSO, partFar: P.HIPS, along: ['spine_01', 'pelvis'] },
  ...[['l', 'L'], ['r', 'R']].flatMap(([s, S]) => [
    limb(`clavicle_${s}`, `upperarm_${s}`, P.TORSO, P[`UPPER_${S}`], `lowerarm_${s}`),
    limb(`upperarm_${s}`, `lowerarm_${s}`, P[`UPPER_${S}`], P[`FORE_${S}`], `hand_${s}`),
    { near: `lowerarm_${s}`, far: `hand_${s}`, partNear: P[`FORE_${S}`], partFar: P[`HAND_${S}`], along: [`lowerarm_${s}`, `hand_${s}`] },
    limb('pelvis', `thigh_${s}`, P.HIPS, P[`THIGH_${S}`], `calf_${s}`),
    limb(`thigh_${s}`, `calf_${s}`, P[`THIGH_${S}`], P[`SHIN_${S}`], `foot_${s}`),
    { near: `calf_${s}`, far: `foot_${s}`, partNear: P[`SHIN_${S}`], partFar: P[`FOOT_${S}`], along: [`calf_${s}`, `foot_${s}`] },
  ]),
];
