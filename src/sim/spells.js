// The spellbook, shared by the sim (what they do) and the page (their names, costs and colours): Bellmourn's twenty, and forty
// more since the six schools (src/sim/skills.js has the trees they stand in, and what points spent in them do to these rows).
// The first twenty keep their places: a save's bar and a scroll name a spell by its place here.

export const MAX_MANA = 120;
export const MANA_REGEN = 9;   // a second

// What each is made of, which picks its colours in the shaders and its noise.
export const ELEM = { FIRE: 0, FROST: 1, ARCANE: 2, STORM: 3, HEAL: 4, LIGHT: 5, DRAIN: 6, BONE: 7, VOID: 8, POISON: 9, SPIRIT: 10, STONE: 11 };

// The colour each casts on the world.
export const ELEM_LIGHT = [
  [1, 0.46, 0.16], [0.5, 0.78, 1], [0.78, 0.3, 1], [0.58, 0.5, 1], [0.72, 1, 0.62], [1, 0.84, 0.56],
  [1, 0.14, 0.2], [0.75, 1, 0.84], [0.55, 0.3, 1], [0.55, 1, 0.26], [0.4, 0.9, 1], [1, 0.72, 0.42],
];

// Shapes the renderer draws them with. From ICE up they are solid things in the world; LIGHT only lights it.
export const FX = {
  ORB: 0, BEAM: 1, BOLT: 2, RING: 3, DISC: 4, FLAME: 5, PUFF: 6, FLARE: 7, TRAIL: 8, RUNE: 9, COLUMN: 10, VORTEX: 11, SHOCK: 12, KITE: 13,
  // GLYPH: a sign drawn in light (GLYPHS below, by its extra): turned to the eye when its axis is nothing, else lying in the
  // world with its axis as its face's normal; its length is how far it's turned in its own plane.
  GLYPH: 14,
  ICE: 16, SPIKE: 17, LANCE: 18, BLADE: 19, ROCK: 20, FLASK: 21,
  // BOX: a block (its length along the axis, size its half width, extra its half depth, seed its turn about the axis), and
  // SHARD: a flat diamond (two crossed make a throwing star). Both are of a MAT, in the age. The other Tessariels' hammers,
  // stars and boomerangs are built of them (src/sim/heroskills.js).
  BOX: 22, SHARD: 23, LIGHT: 31,
};
// What a GLYPH shows.
export const GLYPHS = { NOTE: 0, NOTES: 1, CROTCHET: 2, WAVES: 3, STAR4: 4, CRESCENT: 5, DROP: 6, CROSS: 7, RANG: 8, HAMMER: 9, STAR6: 10, SPARK: 11, WING: 12, SHIELD: 13 };
// What a BOX or a SHARD is made of: steel, gold, wood, or nothing but its element's light.
export const MAT = { STEEL: 0, GOLD: 1, WOOD: 2, LIGHT: 3 };
// A LIGHT with this as its extra is one somebody carries (your party's: src/sim/hero.js partyLights). The renderer keeps
// them a place among the frame's lights of their own, ahead of the spells' (src/gfx/spellfx.js), so they're never crowded out.
export const FX_CARRIED = 7;

const { FIRE, FROST, ARCANE, STORM, HEAL, LIGHT, DRAIN, BONE, VOID, POISON, SPIRIT, STONE } = ELEM;

// rig: which pair of hands. `attack` throws, `raise` calls down and holds up.
export const SPELLS = [
  { key: 'firebolt', name: 'Firebolt', elem: FIRE, rig: 'attack', hands: 1, mana: 10, cast: 'bolt', gather: 2, minGather: 0.3, speed: 34, size: 0.62, dmg: 95, radius: 3.4, burn: 3,
    desc: 'Hold to gather it in the hand, up to two seconds, then it roars away and bursts where it lands. The longer it gathers, the harder it bursts.' },
  { key: 'frost', name: 'Frost Shards', elem: FROST, rig: 'attack', hands: 1, mana: 12, cast: 'bolt', shards: 3, spread: 0.05, speed: 40, size: 0.26, dmg: 22, chill: 3,
    desc: 'Three splinters of ice that shatter into frost and slow what they strike.' },
  { key: 'lightning', name: 'Ball Lightning', elem: STORM, rig: 'attack', hands: 2, mana: 22, cast: 'bolt', speed: 11, size: 0.85, dmg: 70, radius: 4.6, lash: 9, lashReach: 7, life: 6,
    desc: 'A slow sphere of storm that lashes everything around it, then detonates.' },
  { key: 'mend', name: 'Mend', elem: HEAL, rig: 'raise', hands: 2, mana: 25, cast: 'heal', amount: 35, cd: 4,
    desc: 'A circle of light closes your wounds, restoring 35 life.' },
  { key: 'wisp', name: 'Wisp Light', elem: LIGHT, rig: 'raise', hands: 1, mana: 15, cast: 'wisp', duration: 90, glow: 1,
    desc: 'A spirit-light that follows you for ninety seconds and lights the dark.' },
  { key: 'wallfire', name: 'Wall of Fire', elem: FIRE, rig: 'raise', hands: 2, mana: 30, cast: 'wall', range: 24, length: 9, duration: 8, dps: 14, burn: 7,
    desc: 'Raises a wall of fire nine paces long where you look, for eight seconds. What crosses it goes up in flames.' },
  { key: 'missiles', name: 'Magic Missiles', elem: ARCANE, rig: 'attack', hands: 1, mana: 8, cast: 'swarm', channel: true, drain: 12, minHold: 0.2, volley: 4, every: 0.22, interval: 0.1, salvo: 1, max: 9, dmg: 10, speed: 38,
    desc: 'Hold: spinning missiles fan out and hang in the air, more the longer you hold, and dart off one hard after another to seek a foe.' },
  { key: 'arcaneblast', name: 'Arcane Blast', elem: ARCANE, rig: 'attack', hands: 2, mana: 24, cast: 'cone', range: 9, angle: 0.6, dmg: 42, force: 11,
    desc: 'A clap of raw force from both hands: everything in a cone before you is torn at and hurled back.' },
  { key: 'firebeam', name: 'Fire Beam', elem: FIRE, rig: 'attack', hands: 2, mana: 6, cast: 'beam', channel: true, drain: 15, minHold: 0.3, range: 18, dmg: 11, burn: 3,
    desc: 'Hold: a roaring jet of flame pours from your palms, searing and setting alight whatever it plays across.' },
  { key: 'chain', name: 'Chain Lightning', elem: STORM, rig: 'attack', hands: 1, mana: 6, cast: 'chain', channel: true, drain: 15, minHold: 0.3, range: 26, jumps: 5, reach: 8, dmg: 9,
    desc: 'Hold: lightning streams from your palm, and from whatever it strikes it leaps to the nearest other, up to five times.' },
  { key: 'nova', name: 'Frost Nova', elem: FROST, rig: 'raise', hands: 2, mana: 32, cast: 'nova', radius: 10, freeze: 5, dmg: 12, cd: 8,
    desc: 'Ice bursts out from where you stand: all within ten paces are frozen solid for five seconds, and take half again from every blow.' },
  { key: 'meteor', name: 'Meteor', elem: FIRE, rig: 'raise', hands: 2, mana: 42, cast: 'meteor', range: 60, fall: 1.3, radius: 5.5, dmg: 150, cd: 10,
    desc: 'Calls a burning stone out of the sky onto where you look, and leaves the ground on fire.' },
  { key: 'blizzard', name: 'Blizzard', elem: FROST, rig: 'raise', hands: 2, mana: 38, cast: 'storm', range: 38, radius: 5, duration: 7, dmg: 6,
    desc: 'Ice rains on the ground you mark for seven seconds, cutting and slowing all beneath.' },
  { key: 'drain', name: 'Life Drain', elem: DRAIN, rig: 'attack', hands: 1, mana: 4, cast: 'drain', channel: true, drain: 10, minHold: 0.3, range: 18, dmg: 7, heal: 0.7,
    desc: 'Hold: a red thread fastens on the nearest foe before you and pulls its stolen life into yours.' },
  { key: 'blink', name: 'Blink', elem: ARCANE, rig: 'attack', hands: 1, mana: 18, cast: 'blink', range: 14, dmg: 22, cd: 3,
    desc: 'Vanish and step out up to fourteen paces ahead, tearing through anything in the way.' },
  { key: 'lance', name: 'Bone Lance', elem: BONE, rig: 'attack', hands: 1, mana: 16, cast: 'bolt', speed: 48, size: 0.3, pierce: true, dmg: 55,
    desc: 'A spear of sharpened bone that runs through every body in its line and sticks quivering in the wall.' },
  { key: 'well', name: 'Gravity Well', elem: VOID, rig: 'attack', hands: 2, mana: 34, cast: 'bolt', speed: 13, size: 0.7, fuse: 1.4, dmg: 75, radius: 10, duration: 3.2,
    desc: 'A mote of darkness that hangs where it lands, dragging all within ten paces into it, then bursts.' },
  { key: 'plague', name: 'Plague Flask', elem: POISON, rig: 'attack', hands: 1, mana: 20, cast: 'bolt', speed: 17, size: 0.3, grav: 12, lift: 0.2, radius: 4.2, duration: 9, dps: 7, dmg: 10,
    desc: 'A lobbed flask that bursts in a choking green cloud: for nine seconds everything inside it rots and slows.' },
  { key: 'blades', name: 'Spirit Blades', elem: SPIRIT, rig: 'raise', hands: 2, mana: 35, cast: 'blades', count: 4, duration: 20, dmg: 16, radius: 1.6,
    desc: 'Four ghostly swords wheel round you for twenty seconds, hacking at anything that comes near.' },
  { key: 'spikes', name: 'Earthsplitter', elem: STONE, rig: 'attack', hands: 2, mana: 24, cast: 'spikes', count: 13, step: 1.15, dmg: 70,
    desc: 'Spikes of stone burst from the ground in a line before you, impaling what stands there and flinging it into the air.' },

  // ---- Fire ----
  { key: 'comet', name: 'Cinderburst', elem: FIRE, rig: 'attack', hands: 1, mana: 16, cast: 'bolt', speed: 30, size: 0.42, dmg: 55, radius: 3, embers: 6,
    desc: 'A knot of cinders that bursts where it lands and scatters embers all round, each one a small fire of its own.' },
  { key: 'wyrm', name: 'Flame Wyrm', elem: FIRE, rig: 'attack', hands: 1, mana: 22, cast: 'bolt', speed: 19, size: 0.5, dmg: 62, radius: 3, turn: 3.2, life: 4, seek: 28,
    desc: 'A serpent of fire that weaves its own way to the nearest foe, and leaves the ground alight where it strikes.' },
  { key: 'firenova', name: 'Ring of Fire', elem: FIRE, rig: 'raise', hands: 2, mana: 28, cast: 'ring', moat: 6, radius: 5, dmg: 30, dps: 16, burn: 4, cd: 10,
    desc: 'A ring of flame rolls out from where you stand, scorching all it passes, and stands there six seconds as a moat: what crosses it burns.' },
  { key: 'bomb', name: 'Cinder Brand', elem: FIRE, rig: 'attack', hands: 1, mana: 26, cast: 'bolt', speed: 44, size: 0.22, dmg: 90, fuse: 2.5, radius: 4, blast: 0.5, leaps: 1, cd: 4,
    desc: 'Brands a foe with a coal that burns down and bursts. If the foe dies to it, the brand leaps to the two nearest.' },
  { key: 'phoenix', name: 'Phoenix', elem: FIRE, rig: 'attack', hands: 2, mana: 34, cast: 'bolt', speed: 23, size: 0.9, dmg: 45, pierce: true, radius: 2.5, ring: 6, ringDmg: 70, heal: 10, life: 1.6, cd: 8,
    desc: 'A firebird flies through everything in its way, dies in a ring of flame among them, and its ashes mend you.' },
  { key: 'inferno', name: 'Inferno', elem: FIRE, rig: 'raise', hands: 2, mana: 50, cast: 'buff', buff: 'inferno', duration: 12, radius: 4.5, dps: 18, burn: 3, cd: 20,
    desc: 'For twelve seconds you are wreathed in fire: all within reach burn, and the ground burns where you have walked.' },

  // ---- Ice ----
  { key: 'coldcone', name: 'Cone of Cold', elem: FROST, rig: 'attack', hands: 2, mana: 18, cast: 'cone', range: 8, angle: 0.65, dmg: 30, force: 3, chill: 4,
    desc: 'A breath of winter from both hands: everything in a cone before you is cut by it and slowed.' },
  { key: 'rime', name: 'Rime Lance', elem: FROST, rig: 'attack', hands: 1, mana: 16, cast: 'bolt', speed: 38, size: 0.24, dmg: 50, freeze: 1.6, spray: 6,
    desc: 'A lance of ice that freezes what it strikes for a moment and bursts into shards all round.' },
  { key: 'frostray', name: 'Ray of Frost', elem: FROST, rig: 'attack', hands: 2, mana: 6, cast: 'beam', channel: true, drain: 16, minHold: 0.3, range: 20, dmg: 7, chill: 2, freezeAfter: 1.6, freeze: 2,
    desc: 'Hold: a ray of bitter cold that slows what it plays on, and freezes solid what it is held on long enough.' },
  { key: 'prism', name: 'Prismatic Shard', elem: FROST, rig: 'attack', hands: 1, mana: 20, cast: 'bolt', speed: 46, size: 0.24, dmg: 40, beams: 3, beamDmg: 34, beamChill: 1.5, reach: 15, fan: 0.55,
    desc: 'A crystal that splits on what it strikes into three beams of cold light, running on through everything behind and slowing it.' },
  { key: 'orb', name: 'Frozen Orb', elem: FROST, rig: 'attack', hands: 2, mana: 34, cast: 'bolt', speed: 6.5, size: 0.6, dmg: 60, radius: 4.5, ghost: true, shard: 20, every: 0.1, chill: 3, life: 3.2, cd: 6,
    desc: 'A slow globe of ice that rolls through the fight throwing shards in every direction, then bursts.' },
  { key: 'shatter', name: 'Shatter', elem: FROST, rig: 'attack', hands: 1, mana: 24, cast: 'shatter', range: 16, dmg: 55, radius: 3, splash: 0.4, cd: 6,
    desc: 'Every slowed foe within sixteen paces cracks. Every frozen one breaks out of its ice for twice as much, and the shards cut those beside it.' },
  { key: 'zero', name: 'Deadwinter', elem: FROST, rig: 'raise', hands: 2, mana: 55, cast: 'field', field: 'zero', range: 40, radius: 8, delay: 1.2, dmg: 90, freeze: 6, cd: 25,
    desc: 'Marks the ground you look at. A breath later all warmth leaves it: everything inside is frozen solid for six seconds.' },

  // ---- Earth ----
  { key: 'stone', name: 'Stone Shard', elem: STONE, rig: 'attack', hands: 1, mana: 7, cast: 'bolt', speed: 30, size: 0.3, dmg: 40, grav: 5, lift: 0.05, knock: 3,
    desc: 'A fist of rock, thrown hard: it staggers what it strikes and knocks it back a step.' },
  { key: 'thorns', name: 'Thorn Volley', elem: POISON, rig: 'attack', hands: 1, mana: 12, cast: 'bolt', speed: 46, size: 0.2, dmg: 16, shards: 5, spread: 0.075, bleed: 4,
    desc: 'A fan of five thorns. What they strike is left rotting for four seconds.' },
  { key: 'boulder', name: 'Rolling Boulder', elem: STONE, rig: 'attack', hands: 2, mana: 22, cast: 'bolt', speed: 21, size: 0.6, dmg: 85, radius: 3.2, lift: 0.22, grav: 15, life: 6, bounces: 3,
    desc: 'A boulder that bounds on from where it lands, three times, bursting among whatever is there each time. It hurts no one twice.' },
  { key: 'vine', name: 'Grasping Vines', elem: POISON, rig: 'attack', hands: 1, mana: 24, cast: 'bolt', speed: 30, size: 0.2, dmg: 40, reach: 9, grab: 5, root: 2.5, cd: 8,
    desc: 'Where it lands, vines come up under the five nearest, tear at them and hold them fast where they stand.' },
  { key: 'stoneskin', name: 'Stoneskin', elem: STONE, rig: 'raise', hands: 2, mana: 30, cast: 'buff', buff: 'stone', duration: 20, ward: 0.35, cd: 20,
    desc: 'Your skin turns to stone for twenty seconds: every blow that lands does a third less.' },
  { key: 'monolith', name: 'Monolith', elem: STONE, rig: 'raise', hands: 2, mana: 36, cast: 'field', field: 'monolith', range: 30, dmg: 190, radius: 2.4, splash: 0.4, launch: 9, stun: 1.2, cd: 8,
    desc: 'A slab of stone bursts up under whatever you look at: one great blow that throws it into the air and leaves it stunned.' },
  { key: 'quake', name: 'Earthquake', elem: STONE, rig: 'raise', hands: 2, mana: 50, cast: 'field', field: 'quake', range: 30, radius: 8, duration: 6, dmg: 30, jolt: 1.5, cd: 20,
    desc: 'The ground you mark heaves for six seconds: all on it are slowed, and every jolt, one each second and a half, batters them and throws them off their feet.' },

  // ---- Arcane ----
  { key: 'crescent', name: 'Moonblade', elem: SPIRIT, rig: 'attack', hands: 1, mana: 18, cast: 'loose', speed: 24, size: 1, dmg: 42, out: 18,
    desc: 'A spinning crescent that cuts its way out eighteen paces and comes back to your hand, cutting again.' },
  { key: 'rune', name: 'Rune of Force', elem: ARCANE, rig: 'raise', hands: 1, mana: 20, cast: 'field', field: 'rune', range: 24, radius: 3.2, dmg: 70, arm: 0.6, duration: 30, max: 3,
    desc: 'Writes a rune on the ground where you look. The first foe to step on it is blown off its feet with everything near. Three may lie at once.' },
  { key: 'stasis', name: 'Stasis', elem: ARCANE, rig: 'attack', hands: 2, mana: 30, cast: 'bolt', speed: 26, size: 0.3, dmg: 75, zoneR: 4.5, hold: 3, cd: 12,
    desc: 'A sphere where time stops. What is inside hangs there for three seconds, then pays for all of it at once.' },
  { key: 'starfall', name: 'Starfall', elem: ARCANE, rig: 'raise', hands: 2, mana: 44, cast: 'loose', dmg: 55, radius: 3, count: 10, range: 55, spread: 3.2, delay: 0.4, cd: 15,
    desc: 'Marks the ground you look at, and a moment later ten stars come down on it one after another.' },
  { key: 'disintegrate', name: 'Disintegrate', elem: ARCANE, rig: 'attack', hands: 2, mana: 8, cast: 'beam', channel: true, drain: 22, minHold: 0.3, range: 26, dmg: 12, pierce: true, ramp: 0.1, rampMax: 1.5,
    desc: 'Hold: a lance of raw force through everything in its line, biting harder the longer it is held.' },

  // ---- Lightning ----
  { key: 'spark', name: 'Spark', elem: STORM, rig: 'attack', hands: 1, mana: 7, cast: 'zap', range: 32, dmg: 34, leap: 0.5,
    desc: 'A crack of lightning straight to what you look at. Nothing outruns it.' },
  { key: 'fork', name: 'Forked Lightning', elem: STORM, rig: 'attack', hands: 1, mana: 16, cast: 'fork', range: 22, angle: 0.5, forks: 3, dmg: 30,
    desc: 'Lightning that splits as it leaves the hand: three forks, each to a foe of its own before you.' },
  { key: 'seed', name: 'Storm Seed', elem: STORM, rig: 'attack', hands: 1, mana: 14, cast: 'bolt', speed: 30, size: 0.32, dmg: 12, reach: 7, hold: 6, relay: 0.6, max: 2,
    desc: 'A spark that sticks to what it strikes, or where it lands, for six seconds. Any lightning that strikes there leaps on to everyone within seven paces. Two may be set at once.' },
  { key: 'thunderclap', name: 'Thunderclap', elem: STORM, rig: 'raise', hands: 2, mana: 24, cast: 'ring', radius: 6, dmg: 34, stun: 1.4, force: 7, cd: 6,
    desc: 'A clap of thunder from where you stand: all within six paces are thrown back and left stunned.' },
  { key: 'stormstep', name: 'Stormstep', elem: STORM, rig: 'attack', hands: 1, mana: 20, cast: 'blink', charge: true, range: 18, dmg: 40, stun: 1, cd: 5,
    desc: 'You go as lightning to the foe you look at, through everything between, and arrive on it in a crack of thunder that leaves it stunned.' },
  { key: 'thunder', name: 'Thunderbolt', elem: STORM, rig: 'raise', hands: 1, mana: 30, cast: 'field', field: 'thunder', range: 60, radius: 3, delay: 0.35, dmg: 110, stun: 1.5, cd: 5,
    desc: 'Calls a bolt out of the sky onto where you look. What it strikes is stunned, if it lives.' },
  { key: 'staticfield', name: 'Static Field', elem: STORM, rig: 'raise', hands: 2, mana: 32, cast: 'buff', buff: 'static', duration: 15, radius: 6, every: 1, arcs: 3, dmg: 12, cd: 12,
    desc: 'For fifteen seconds lightning leaps from you to the three nearest foes within six paces, once a second.' },
  { key: 'tempest', name: 'Thunderstorm', elem: STORM, rig: 'raise', hands: 2, mana: 52, cast: 'field', field: 'tempest', range: 40, radius: 9, duration: 8, every: 0.4, dmg: 30, blast: 3, stun: 0.5, cd: 15,
    desc: 'A storm gathers over the ground you mark: for eight seconds bolt after bolt comes down on whoever is under it.' },

  // ---- Utility ----
  { key: 'fleet', name: 'Fleetfoot', elem: SPIRIT, rig: 'raise', hands: 1, mana: 16, cast: 'buff', buff: 'haste', duration: 12, haste: 0.3, cd: 12,
    desc: 'The wind at your back: for twelve seconds you walk and run a third faster.' },
  { key: 'turn', name: 'Turn the Dead', elem: LIGHT, rig: 'raise', hands: 1, mana: 18, cast: 'ring', radius: 9, dmg: 14, rout: 1.5, burn: 3, daze: 1, force: 6, cd: 12,
    desc: 'Light breaks from your hand. The risen dead within nine paces are driven back, burning, and stand helpless a moment; anything else is dazed.' },
  { key: 'aegis', name: 'Aegis', elem: LIGHT, rig: 'raise', hands: 2, mana: 28, cast: 'buff', buff: 'aegis', duration: 20, pool: 60, cd: 12,
    desc: 'A shell of light that takes the next sixty points of harm for you, for twenty seconds or until it breaks.' },
  { key: 'renew', name: 'Renew', elem: HEAL, rig: 'raise', hands: 1, mana: 20, cast: 'buff', buff: 'renew', duration: 10, amount: 60, cd: 4,
    desc: 'Your wounds knit as you fight: sixty life, a little at a time, over ten seconds.' },
  { key: 'empower', name: 'Empower', elem: LIGHT, rig: 'raise', hands: 2, mana: 30, cast: 'buff', buff: 'might', duration: 20, might: 0.4, charges: 3, cd: 30,
    desc: 'Your next three spells bite two-fifths harder. Unspent, it fades in twenty seconds.' },
  { key: 'sanctuary', name: 'Sanctuary', elem: HEAL, rig: 'raise', hands: 2, mana: 36, cast: 'field', field: 'sanctuary', radius: 6, duration: 10, heal: 5, regen: 0.5, dps: 6, cd: 25,
    desc: 'Hallows the ground where you stand for ten seconds. Inside it you mend and your mana comes back half again as fast; what means you harm is slowed and seared by it.' },
  { key: 'stillness', name: 'Stillness', elem: LIGHT, rig: 'raise', hands: 2, mana: 60, cast: 'buff', buff: 'still', duration: 4, cd: 60,
    desc: 'The world slows to a crawl round you for four seconds, your company with it. You do not, and nor does what you cast.' },
];
