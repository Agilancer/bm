// What the threads share. The sim thread writes whole snapshots into one of three slots and publishes
// the slot index; the render thread reads the newest. Input flows the other way as a small block.

export const MAX_CHARS = 40;
export const MAX_JOINTS = 72;
export const VM_JOINTS = 56;
export const MAX_GASH = 24;
export const MAX_PIECES = 64;
export const MAX_BLEEDS = 8;
export const GASH_FLOATS = 16;

// Control words (Int32Array)
export const CTRL = { LATEST: 0, READING: 1, TICK: 2, EV_HEAD: 3, INPUT_SEQ: 4, PLAN_RUN: 5, PLAN_SEQ: 6, PUB_MS: 7, SIZE: 16 };

// Input block (Float32Array)
export const INPUT = { MOVE_X: 0, MOVE_Z: 1, YAW: 2, PITCH: 3, SPRINT: 4, ATTACK: 5, WIDE: 6, JUMP: 7, RESTART: 8, ASPECT: 9, CMD: 10, CMD_A: 11, CMD_B: 12, CMD_C: 13, PAUSE: 14, DODGE: 15, TOUCH: 16,
  // The sword in hand, as an index into WEAPONS, and what it comes to with its rolls and gems. See src/items/items.js.
  WEAPON: 17, W_MIN: 18, W_MAX: 19, W_PIERCE: 20, W_POISE: 21, W_STAM: 22, W_SPEED: 23, W_LEECH: 24, W_LIFE: 25,
  // The spell chosen, the cast key held, and a count of presses, so a tap between ticks isn't lost.
  SPELL: 26, CAST: 27, CAST_N: 28,
  // Space held down, for the shield surf, and whether there's a shield to ride.
  JUMP_HELD: 29, SHIELD: 30,
  // The right button held, for the shield.
  BLOCK: 31,
  // What the player's armour comes to; and which doors stand open, a bit for each (src/items/doors.js).
  ARMOR: 32, DOORS: 33,
  // Running totals of what's been picked up off the ground: life and mana.
  HEAL: 34, MANA_UP: 35,
  // What gear and level come to for spells; and a skull in the left hand, which puts the shield's guard away.
  POWER: 36, MANA_MAX: 37, REGEN: 38, THRIFT: 39, SKULL: 40,
  VIEW_ASPECT: 41,
  // The shield's special ability and its strength: SHIELD_POWERS in src/items/items.js. 0 with a skull in hand.
  SH_POWER: 44, SH_VALUE: 45, SIZE: 46 };

// Snapshot header (float offsets)
export const H = {
  TIME: 0, TICK: 1, PX: 2, PY: 3, PZ: 4, VX: 5, VY: 6, VZ: 7, HP: 8, MAX_HP: 9, SHAKE_X: 10, SHAKE_Y: 11, SHAKE_R: 12,
  DMG_FLASH: 13, BLOOD_SWORD: 14, SWINGING: 15, SWING_T: 16, TIP_X: 17, TIP_Y: 18, TIP_Z: 19, ROOT_X: 20, ROOT_Y: 21, ROOT_Z: 22,
  NCHARS: 23, GAME: 24, GAME_T: 25, HIT_DIR: 26, HIT_DIR_T: 27, GROUND_SPEED: 28, ON_GROUND: 29, CAM_DROP: 30, WEAK: 31,
  TIME_SCALE: 32, TACTIC: 33, TACTIC_CONF: 34, ROLLOUTS: 35, BOB: 36, STAMINA: 37, AIM_WOUND: 38, DODGE: 39, PARRIED: 40, WEAPON: 41,
  MANA: 42, MAX_MANA: 43, SPELL: 44, SPELL_RIG: 45, VM_LOWER: 46, CAST_HELD: 47, FX_N: 48, SURF: 49, SURF_ARM: 50, SURF_TILT: 51, SHIELD_UP: 52, CARRY_T: 53, CARRY_K: 54, SKULL_LOWER: 55, OPENING: 56, OPENING_TIME: 57, OPENING_NEXT: 58, SIZE: 59,
};

// Per-character block
export const C = {
  ACTIVE: 0, KIND: 1, X: 2, Y: 3, Z: 4, YAW: 5, HP: 6, MAX_HP: 7, BLEED: 8, STATE: 9, GASH_VERSION: 10, GASH_COUNT: 11,
  N_BLEEDS: 12, HOSTILE: 13, STAM: 14, SPEED: 15, GLINT: 16, HEART: 17, ARMOR: 18, LANDED: 19, CUT: 20, SIZE_HEAD: 21,
};
export const C_PALETTE = C.SIZE_HEAD;
export const C_PROPS = C_PALETTE + MAX_JOINTS * 8;
export const C_BLEEDS = C_PROPS + 2 * 16;
export const C_GASH = C_BLEEDS + MAX_BLEEDS * 8;
export const C_MASKS = C_GASH + MAX_GASH * GASH_FLOATS;
export const C_SIZE = C_MASKS + MAX_PIECES;

export const VM_PALETTE = H.SIZE;
// The spell hands, beside the sword's arms, and the spells: what's alive this tick, as shapes (src/sim/spells.js).
export const SPELL_PALETTE = VM_PALETTE + VM_JOINTS * 8;
export const FX_START = SPELL_PALETTE + VM_JOINTS * 8;
export const FX_FLOATS = 16;
export const MAX_FX = 256;
export const CHARS_START = FX_START + MAX_FX * FX_FLOATS;
export const SNAP_FLOATS = CHARS_START + MAX_CHARS * C_SIZE;

export const EV_FLOATS = 8;
export const EV_CAPACITY = 512;

// Planner: observation written by the sim, tallies written by the job threads.
export const PLAN_TACTICS = 6;
export const PLAN_OBS = 24;
export const PLAN_FLOATS = PLAN_OBS + PLAN_TACTICS * 2 + 2;

export const TOTAL_BYTES = 4 * (CTRL.SIZE + INPUT.SIZE + SNAP_FLOATS * 3 + EV_FLOATS * EV_CAPACITY + PLAN_FLOATS);

export function mapShared(buffer) {
  let off = 0;
  const take = (Type, n) => { const a = new Type(buffer, off, n); off += n * 4; return a; };
  return {
    ctrl: take(Int32Array, CTRL.SIZE),
    input: take(Float32Array, INPUT.SIZE),
    snaps: [take(Float32Array, SNAP_FLOATS), take(Float32Array, SNAP_FLOATS), take(Float32Array, SNAP_FLOATS)],
    events: take(Float32Array, EV_FLOATS * EV_CAPACITY),
    plan: take(Float32Array, PLAN_FLOATS),
  };
}

export const EV = {
  SWING: 1, BITE: 2, GASH: 3, PUNCTURE: 4, BLOCK: 5, PARRY: 6, HURT: 7, STEP: 8, ROLL: 9, GRUNT: 10, DEATH: 11, WALL: 12,
  GROUND: 13, GLINT: 14, BLOOD: 15, JUMP: 16, LAND: 17, SHIELD_BREAK: 18, DUST: 19, WHOOSH: 20, ALERT: 21, TAUNT: 22, WIN: 23, LOSE: 24,
  CRAB_HIT: 25, CRAB_DIE: 26, DODGE: 27, CRAB_WAKE: 28, ROAR: 29, BEAST_NOTICE: 30, FIRE: 31, FIRE_HIT: 32, SEVER: 33, STUMP: 34, CHUNK_LAND: 35, HYDRA_NOTICE: 36, BURN: 37, LOOT: 38, EMPTY_HANDS: 39,
  SPELL_CAST: 40, SPELL_LOOSE: 41, SPELL_HIT: 42, SPELL_BOOM: 43, SPELL_FIZZLE: 44,
  GROAN: 45, DIRT: 46, CHANT: 47, BLINK: 48, UNDEAD_DIE: 49, CHAMPION: 50, CHAMPION: 50,
};

// What can be in the hands: an index is what crosses between the threads, and 0 is nothing. hands says which rig swings it: 3 is the staff's, one arm.
export const WEAPONS = [
  null,
  { id: 'greatsword', hands: 2 },
  { id: 'gilded_sword', hands: 1 }, { id: 'crimson_sword', hands: 1 }, { id: 'thornvine_sword', hands: 1 }, { id: 'frost_sword', hands: 1 },
  { id: 'ringed_sword', hands: 1 }, { id: 'bronze_broadsword', hands: 1 }, { id: 'brass_sabre', hands: 1 }, { id: 'swept_rapier', hands: 1 },
  { id: 'wheel_greatsword', hands: 2 }, { id: 'bluegrip_greatsword', hands: 2 }, { id: 'fluked_greatsword', hands: 2 }, { id: 'greengrip_greatsword', hands: 2 },
  { id: 'greenwood_staff', hands: 3 }, { id: 'crystal_staff', hands: 3 }, { id: 'skullhorn_staff', hands: 3 }, { id: 'gnarled_crook', hands: 3 },
  { id: 'dark_staff', hands: 3 }, { id: 'death_staff', hands: 3 }, { id: 'earth_staff', hands: 3 }, { id: 'fire_staff', hands: 3 },
  { id: 'ice_staff', hands: 3 }, { id: 'life_staff', hands: 3 }, { id: 'vine_staff', hands: 3 }, { id: 'wind_staff', hands: 3 },
];

export const STATE_NAMES = ['patrol', 'alert', 'approach', 'circle', 'attack', 'block', 'roll', 'stagger', 'retreat', 'break', 'dead', 'taunt', 'feint', 'idle'];
export const TACTICS = ['press', 'circle', 'bait', 'shield wall', 'flank dash', 'fall back'];
