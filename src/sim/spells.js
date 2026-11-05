// The spellbook, shared by the sim (what they do) and the page (their names, costs and colours). Bellmourn's twenty.

export const MAX_MANA = 120;
export const MANA_REGEN = 11;   // a second

// What each is made of, which picks its colours in the shaders and its noise.
export const ELEM = { FIRE: 0, FROST: 1, ARCANE: 2, STORM: 3, HEAL: 4, LIGHT: 5, DRAIN: 6, BONE: 7, VOID: 8, POISON: 9, SPIRIT: 10, STONE: 11 };

// The colour each casts on the world.
export const ELEM_LIGHT = [
  [1, 0.46, 0.16], [0.5, 0.78, 1], [0.78, 0.3, 1], [0.58, 0.5, 1], [0.72, 1, 0.62], [1, 0.84, 0.56],
  [1, 0.14, 0.2], [0.75, 1, 0.84], [0.55, 0.3, 1], [0.55, 1, 0.26], [0.4, 0.9, 1], [1, 0.72, 0.42],
];

// Shapes the renderer draws them with. From ICE up they are solid things in the world; LIGHT only lights it.
export const FX = {
  ORB: 0, BEAM: 1, BOLT: 2, RING: 3, DISC: 4, FLAME: 5, PUFF: 6, FLARE: 7, TRAIL: 8, RUNE: 9, COLUMN: 10, VORTEX: 11, SHOCK: 12,
  ICE: 16, SPIKE: 17, LANCE: 18, BLADE: 19, ROCK: 20, FLASK: 21, LIGHT: 31,
};

const { FIRE, FROST, ARCANE, STORM, HEAL, LIGHT, DRAIN, BONE, VOID, POISON, SPIRIT, STONE } = ELEM;

// rig: which pair of hands. `attack` throws, `raise` calls down and holds up.
export const SPELLS = [
  { key: 'firebolt', name: 'Firebolt', elem: FIRE, rig: 'attack', hands: 1, mana: 8, cast: 'bolt', gather: 2, minGather: 0.3, speed: 34, size: 0.62, dmg: 80, radius: 3.4,
    desc: 'Hold to gather it in the hand, up to two seconds, then it roars away and bursts where it lands. The longer it gathers, the harder it bursts.' },
  { key: 'frost', name: 'Frost Shards', elem: FROST, rig: 'attack', hands: 1, mana: 12, cast: 'bolt', shards: 3, spread: 0.05, speed: 40, size: 0.26, dmg: 22, chill: 3,
    desc: 'Three splinters of ice that shatter into frost and slow what they strike.' },
  { key: 'lightning', name: 'Ball Lightning', elem: STORM, rig: 'attack', hands: 2, mana: 22, cast: 'bolt', speed: 11, size: 0.85, dmg: 70, radius: 4.6, lash: 9, life: 6,
    desc: 'A slow sphere of storm that lashes everything around it, then detonates.' },
  { key: 'mend', name: 'Mend', elem: HEAL, rig: 'raise', hands: 2, mana: 25, cast: 'heal', amount: 35,
    desc: 'A circle of light closes your wounds, restoring 35 life.' },
  { key: 'wisp', name: 'Wisp Light', elem: LIGHT, rig: 'raise', hands: 1, mana: 15, cast: 'wisp', duration: 90,
    desc: 'A spirit-light that follows you for ninety seconds and lights the dark.' },
  { key: 'wallfire', name: 'Wall of Fire', elem: FIRE, rig: 'raise', hands: 2, mana: 30, cast: 'wall', range: 24, length: 9, duration: 8, dps: 14, burn: 7,
    desc: 'Raises a wall of fire nine paces long where you look, for eight seconds. What crosses it goes up in flames.' },
  { key: 'missiles', name: 'Magic Missiles', elem: ARCANE, rig: 'attack', hands: 1, mana: 8, cast: 'swarm', channel: true, drain: 16, minHold: 0.25, volley: 5, every: 0.2, interval: 0.5, max: 24, dmg: 14,
    desc: 'Hold: spinning missiles fan out and hang in the air, more the longer you hold. One every half second darts off to seek a foe.' },
  { key: 'arcaneblast', name: 'Arcane Blast', elem: ARCANE, rig: 'attack', hands: 2, mana: 24, cast: 'cone', range: 9, angle: 0.6, dmg: 42, force: 11,
    desc: 'A thunderclap of raw force from both hands: everything in a cone before you is torn at and hurled back.' },
  { key: 'firebeam', name: 'Fire Beam', elem: FIRE, rig: 'attack', hands: 2, mana: 6, cast: 'beam', channel: true, drain: 18, minHold: 0.3, range: 18, dmg: 8, burn: 3,
    desc: 'Hold: a roaring jet of flame pours from your palms, searing and setting alight whatever it plays across.' },
  { key: 'chain', name: 'Chain Lightning', elem: STORM, rig: 'attack', hands: 1, mana: 6, cast: 'chain', channel: true, drain: 15, minHold: 0.3, range: 26, jumps: 5, reach: 8, dmg: 9,
    desc: 'Hold: lightning streams from your palm, and from whatever it strikes it leaps to the nearest other, up to five times.' },
  { key: 'nova', name: 'Frost Nova', elem: FROST, rig: 'raise', hands: 2, mana: 32, cast: 'nova', radius: 10, freeze: 5, dmg: 12,
    desc: 'Ice bursts out from where you stand: all within ten paces are frozen solid for five seconds, and take half again from every blow.' },
  { key: 'meteor', name: 'Meteor', elem: FIRE, rig: 'raise', hands: 2, mana: 45, cast: 'meteor', range: 60, fall: 1.3, radius: 5.5, dmg: 95,
    desc: 'Calls a burning stone out of the sky onto where you look, and leaves the ground on fire.' },
  { key: 'blizzard', name: 'Blizzard', elem: FROST, rig: 'raise', hands: 2, mana: 38, cast: 'storm', range: 38, radius: 5, duration: 7, dmg: 6,
    desc: 'Ice rains on the ground you mark for seven seconds, cutting and slowing all beneath.' },
  { key: 'drain', name: 'Life Drain', elem: DRAIN, rig: 'attack', hands: 1, mana: 4, cast: 'drain', channel: true, drain: 10, minHold: 0.3, range: 18, dmg: 7, heal: 0.7,
    desc: 'Hold: a red thread fastens on the nearest foe before you and pulls its stolen life into yours.' },
  { key: 'blink', name: 'Blink', elem: ARCANE, rig: 'attack', hands: 1, mana: 18, cast: 'blink', range: 14, dmg: 22,
    desc: 'Vanish and step out up to fourteen paces ahead, tearing through anything in the way.' },
  { key: 'lance', name: 'Bone Lance', elem: BONE, rig: 'attack', hands: 1, mana: 16, cast: 'bolt', speed: 48, size: 0.3, pierce: true, dmg: 55,
    desc: 'A spear of sharpened bone that runs through every body in its line and sticks quivering in the wall.' },
  { key: 'well', name: 'Gravity Well', elem: VOID, rig: 'attack', hands: 2, mana: 34, cast: 'bolt', speed: 13, size: 0.7, fuse: 1.4, dmg: 75, radius: 10, duration: 3.2,
    desc: 'A mote of darkness that hangs where it lands, dragging all within ten paces into it, then bursts.' },
  { key: 'plague', name: 'Plague Flask', elem: POISON, rig: 'attack', hands: 1, mana: 20, cast: 'bolt', speed: 17, size: 0.3, grav: 12, lift: 0.2, radius: 4.2, duration: 9, dps: 7, dmg: 10,
    desc: 'A lobbed flask that bursts in a choking green cloud: for nine seconds everything inside it rots and slows.' },
  { key: 'blades', name: 'Spirit Blades', elem: SPIRIT, rig: 'raise', hands: 2, mana: 35, cast: 'blades', count: 4, duration: 20, dmg: 16, radius: 1.6,
    desc: 'Four ghostly swords wheel round you for twenty seconds, hacking at anything that comes near.' },
  { key: 'spikes', name: 'Earthsplitter', elem: STONE, rig: 'attack', hands: 2, mana: 28, cast: 'spikes', count: 13, step: 1.15, dmg: 45,
    desc: 'Spikes of stone burst from the ground in a line before you, impaling what stands there and flinging it into the air.' },
];
