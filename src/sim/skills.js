// The six schools: which spell stands where in each tree, what it takes to learn it, what each rank of it adds, and the two
// branches that hang off every spell. Shared by the page (the book: src/ui/skilltree.js; the points: src/items/skillbook.js) and
// the sim (Casting.setSkills, src/sim/casting.js), which both make a spell's numbers the same way: effective() below.
//
// A point buys one rank of one node:
//   a spell     five ranks; the first learns it. It needs your level to have reached its tier's (TIER_LEVEL), so many points
//               already spent in its school (TIER_POINTS), and one of the spells it grows from (req) known.
//   a branch    one to three ranks. Every spell has two and you take one or the other, never both; a branch's rank can be no
//               more than its spell's rank less one, so a spell is raised before it's shaped.
//   a mastery   one a school, five ranks, after MASTERY.needs points in the school.
// The six spells you start with, and any read from a scroll, have their first rank for nothing; that rank doesn't count as
// a point spent.
//
// What a rank or a branch changes is written as numbers on the spell's row in spells.js:
//   per:  { field: f }   the field is multiplied by (1 + f * n)      (n: ranks past the first; or the branch's ranks)
//   plus: { field: v }   v * n is added to it
//   at:   { 3: {...} }   added once, from that rank on
//   set:  { field: v }   set outright, by a branch with any rank in it
// Fields the cast code reads that no row has until a branch gives them (embers, pierce, twin, ...) are that branch's doing.
import { ELEM, SPELLS } from './spells.js';

export const MAX_RANK = 5;
// The level each tier of a tree opens at, left to right, and the points that must already be in the school.
export const TIER_LEVEL = [1, 2, 6, 11, 17];
export const TIER_POINTS = [0, 0, 3, 6, 10];
// Every rank of a spell past the first: this much more of what it does, unless its row here says otherwise.
export const RANK_DMG = 0.15;
// What "what it does" is, across the rows: a rank and a mastery both scale these.
export const DMG_FIELDS = ['dmg', 'dps', 'lash', 'ringDmg', 'beamDmg', 'rayDmg', 'shard'];
const MEND_FIELDS = ['amount', 'pool'];
// A school's mastery, a rank: its spells do this much more and cost this much less.
export const MASTERY = { max: 5, dmg: 0.04, mana: 0.03, needs: 8 };
// Scrolls are written for the second and third tiers only: the great spells were never set down.
export const SCROLL_TIERS = 3;

// One point a level past the first, and one more at every fifth.
export const pointsAt = (level) => Math.max(0, level - 1) + Math.floor(Math.max(1, level) / 5);
// What unlearning everything costs, in gold.
export const respecCost = (level, spent) => (spent > 0 ? 20 + level * 12 : 0);

const { FIRE, FROST, STONE, ARCANE, STORM, LIGHT } = ELEM;

// s(key, tier, row, req, up, [branch, branch]); b(id, name, max, desc, mods)
const s = (key, tier, row, req, up, augs) => ({ key, tier, row, req: req ? [].concat(req) : [], up: up || {}, augs });
const b = (id, name, max, desc, mods = {}) => ({ id, name, max, desc, ...mods });

export const TREES = [
  {
    key: 'fire', name: 'Fire', elem: FIRE, mastery: 'Pyromancer',
    blurb: 'Burst and burning. Fire hits hardest in the moment and keeps hurting after: the ground burns, and so do they.',
    spells: [
      s('firebolt', 0, 1, null, { per: { radius: 0.04 } }, [
        b('searing', 'Searing Core', 3, 'Gathers 15% quicker a rank, and what it strikes burns 2 seconds longer.', { per: { gather: -0.15 }, plus: { burn: 2 } }),
        b('banked', 'Banked', 1, 'A full gather can be held in the hand five seconds more before it is thrown.', { set: { bank: 5 } }),
      ]),
      s('firebeam', 1, 0, 'firebolt', { plus: { range: 1 } }, [
        b('whiteheat', 'White Heat', 1, 'Held on one foe, the beam burns hotter: 6% more with every bite, up to 60% more. Its core goes white.', { set: { ramp: 0.06, rampMax: 0.6 } }),
        b('sweep', 'Sweeping Flame', 1, 'The jet opens into a short, wide fan that burns everything in it: half as far, and each for a little over half.', { set: { fan: 0.45 }, per: { range: -0.45, dmg: -0.45 } }),
      ]),
      s('comet', 1, 2, 'firebolt', { at: { 3: { embers: 1 }, 5: { embers: 1 } } }, [
        b('wildfire', 'Wildfire', 2, 'Two more embers a rank, and every ember leaves the ground burning.', { plus: { embers: 2 }, set: { emberFire: 3 } }),
        b('heavycore', 'Heavy Core', 1, 'A third again as wide a burst, and it throws what it catches into the air.', { per: { radius: 0.35 }, set: { launch: 6 } }),
      ]),
      s('wallfire', 2, 0, 'firebeam', { per: { dps: RANK_DMG }, plus: { length: 1 } }, [
        b('longburn', 'Long Burn', 3, 'The wall stands 2 seconds longer a rank.', { plus: { duration: 2 } }),
        b('backdraft', 'Backdraft', 1, 'What crosses the wall is thrown back from it, and burns 3 seconds longer.', { set: { backdraft: 7 }, plus: { burn: 3 } }),
      ]),
      s('firenova', 2, 1, ['firebeam', 'comet'], { per: { radius: 0.05 } }, [
        b('highflames', 'High Flames', 2, 'The moat stands 2 seconds longer and burns 15% hotter, a rank.', { plus: { moat: 2 }, per: { dps: 0.15 } }),
        b('kindled', 'Kindled', 1, 'Each foe the ring catches as it rolls out gives you back 4 mana, up to four of them.', { set: { kindle: 4, kindleMax: 4 } }),
      ]),
      s('wyrm', 2, 2, 'comet', { plus: { turn: 0.4 } }, [
        b('twin', 'Twin Wyrms', 1, 'Two wyrms, each for 70%, hunting on their own.', { set: { twin: true }, per: { dmg: -0.3 } }),
        b('trail', 'Scorched Trail', 1, 'The wyrm leaves the ground burning all along its way.', { set: { trail: true } }),
      ]),
      s('phoenix', 3, 0, ['wallfire', 'firenova'], { plus: { heal: 2 } }, [
        b('rebirth', 'Rebirth', 1, 'From its ring of flame it rises once more and flies on, for half.', { set: { rebirth: 0.5 } }),
        b('cauterise', 'Cauterise', 2, 'Its ashes mend 8 more a rank, and its ring reaches a tenth further.', { plus: { heal: 8 }, per: { ring: 0.1 } }),
      ]),
      s('bomb', 3, 2, ['wyrm', 'firenova'], {}, [
        b('wildbrand', 'Wildbrand', 2, 'The brand leaps one more time a rank.', { plus: { leaps: 1 } }),
        b('shortfuse', 'Short Fuse', 1, 'Burns down 40% sooner, and bursts a fifth wider.', { per: { fuse: -0.4, radius: 0.2 } }),
      ]),
      s('inferno', 4, 0, 'phoenix', { per: { dps: RANK_DMG }, plus: { duration: 1 } }, [
        b('firewalker', 'Firewalker', 1, 'While it burns you move a fifth faster.', { set: { firewalk: 0.2 } }),
        b('conflagration', 'Conflagration', 1, 'As it gutters out it bursts, six paces wide.', { set: { finale: 80 } }),
      ]),
      s('meteor', 4, 2, 'bomb', { per: { radius: 0.04 } }, [
        b('shower', 'Meteor Shower', 2, 'One more, smaller stone a rank comes down beside the first.', { plus: { shower: 1 } }),
        b('crater', 'Molten Crater', 1, 'The whole of the crater burns, for 10 seconds, a quarter again as hot.', { set: { crater: true } }),
      ]),
    ],
  },
  {
    key: 'ice', name: 'Ice', elem: FROST, mastery: 'Cryomancer',
    blurb: 'Control. Ice slows what comes at you and stops it dead, and whatever is frozen takes half again from every blow.',
    spells: [
      s('frost', 0, 1, null, { at: { 3: { shards: 1 }, 5: { shards: 1 } } }, [
        b('piercing', 'Piercing Cold', 1, 'The shards run through what they strike and on.', { set: { pierce: true } }),
        b('deepchill', 'Deep Chill', 3, 'Slows 1.5 seconds longer a rank. At the third, a shard into something already slowed freezes it a moment.', { plus: { chill: 1.5 }, at: { 3: { snap: 1 } } }),
      ]),
      s('coldcone', 1, 0, 'frost', { plus: { range: 0.5 } }, [
        b('flash', 'Flash Freeze', 1, 'Whatever is in the near half of the cone is frozen for a second and a half.', { set: { flash: 1.5 } }),
        b('widearc', 'Wide Arc', 2, 'A fifth wider a rank.', { per: { angle: 0.2 } }),
      ]),
      s('rime', 1, 2, 'frost', { plus: { freeze: 0.2 } }, [
        b('splintering', 'Splintering', 2, 'Bursts into three more shards a rank.', { plus: { spray: 3 } }),
        b('glacial', 'Glacial Spike', 1, 'The lance runs through everything in its line, freezing each as it goes.', { set: { pierce: true } }),
      ]),
      s('nova', 2, 0, 'coldcone', { per: { radius: 0.05 } }, [
        b('brittle', 'Brittle', 1, 'The first blow to land on each thing it froze does double, not half again.', { set: { brittle: true } }),
        b('rimeguard', 'Rime Guard', 1, 'The burst leaves you rimed for 6 seconds: every blow that lands does a quarter less.', { set: { guard: 6 } }),
      ]),
      s('frostray', 2, 1, ['coldcone', 'rime'], {}, [
        b('coldsnap', 'Cold Snap', 1, 'Freezes in a second, not a second and a half, and for a second longer.', { per: { freezeAfter: -0.4 }, plus: { freeze: 1 } }),
        b('split', 'Splitting Ray', 1, 'The ray forks from what it strikes to the two nearest, for half.', { set: { split: 2 } }),
      ]),
      s('prism', 2, 2, 'rime', {}, [
        b('refraction', 'Refraction', 2, 'One more beam a rank.', { plus: { beams: 1 } }),
        b('diamond', 'Diamond Light', 1, 'The beams reach half again as far, and slow what they cross twice as long.', { per: { reach: 0.5, beamChill: 1 } }),
      ]),
      s('blizzard', 3, 0, 'nova', { per: { radius: 0.05 } }, [
        b('whiteout', 'Whiteout', 2, 'Lasts 2.5 seconds longer a rank.', { plus: { duration: 2.5 } }),
        b('hail', 'Hailstones', 1, 'A great hailstone comes down on someone under it every second or so, and stops them where they stand a moment.', { set: { hail: 30 } }),
      ]),
      s('shatter', 3, 1, ['nova', 'frostray'], {}, [
        b('chainshatter', 'Chain Shatter', 1, 'What it kills breaks open in turn, for half, on those beside it.', { set: { chainShatter: 0.5 } }),
        b('coldreach', 'Cold Reach', 2, 'Reaches 5 paces further a rank, and slows whatever in reach was not slowed already.', { plus: { range: 5 }, set: { frostbite: 3 } }),
      ]),
      s('orb', 3, 2, 'prism', {}, [
        b('shardstorm', 'Shard Storm', 2, 'Throws its shards a fifth faster a rank.', { per: { every: -0.2 } }),
        b('wintersheart', 'Winter\'s Heart', 1, 'Its last burst is two-fifths wider and freezes what it catches for 2 seconds.', { per: { radius: 0.4 }, set: { burstFreeze: 2 } }),
      ]),
      s('zero', 4, 1, ['blizzard', 'shatter', 'orb'], { plus: { freeze: 0.5 } }, [
        b('killingfrost', 'Killing Frost', 1, 'Lesser foes it leaves at a fifth of their life or under are broken outright.', { set: { execute: 0.2 } }),
        b('longwinter', 'Long Winter', 2, '15% wider a rank, and the cold lies on the ground 2 seconds a rank after, slowing all who cross it.', { per: { radius: 0.15 }, plus: { linger: 2 } }),
      ]),
    ],
  },
  {
    key: 'earth', name: 'Earth', elem: STONE, mastery: 'Geomancer',
    blurb: 'Stone, bone, root and rot. Earth knocks things down, runs them through and wears them away, and makes you hard to kill.',
    spells: [
      s('stone', 0, 1, null, { plus: { knock: 0.5 } }, [
        b('fragment', 'Shivered Stone', 1, 'It breaks on what it strikes, and three pieces fly on into those near for two-fifths.', { set: { frag: 3 } }),
        b('heavyhand', 'Heavy Hand', 3, 'A tenth harder a rank, and it knocks them further. At the third it leaves them stunned a moment.', { per: { dmg: 0.1 }, plus: { knock: 1.5 }, at: { 3: { stun: 0.5 } } }),
      ]),
      s('lance', 1, 0, 'stone', {}, [
        b('marrow', 'Marrow Splinters', 1, 'Each body it runs through throws two splinters of bone out to the sides.', { set: { splinters: 2 } }),
        b('impale', 'Impale', 2, 'A fifth harder a rank on the first it strikes, which is left rotting.', { plus: { impale: 0.2 }, set: { bleed: 3 } }),
      ]),
      s('thorns', 1, 2, 'stone', { at: { 3: { shards: 1 }, 5: { shards: 1 } } }, [
        b('venom', 'Venom', 3, 'They rot 2 seconds longer a rank.', { plus: { bleed: 2 } }),
        b('briar', 'Briar', 1, 'What a thorn strikes is snared and slowed for 2 seconds.', { set: { snare: 2 } }),
      ]),
      s('spikes', 2, 0, 'lance', { plus: { count: 1 } }, [
        b('aftershock', 'Aftershock', 1, 'The spikes burst up a second time a moment later, for half.', { set: { aftershock: 0.5 } }),
        b('jagged', 'Jagged', 2, 'What they throw comes down stunned, half a second a rank.', { plus: { stun: 0.5 } }),
      ]),
      s('boulder', 2, 1, ['lance', 'thorns'], {}, [
        b('landslide', 'Landslide', 1, 'At its first bound it breaks into three, each going its own way for half.', { set: { split: 3 } }),
        b('momentum', 'Gathering Weight', 2, 'One more bound a rank, and each bound hits 15% harder than the last.', { plus: { bounces: 1, gain: 0.15 } }),
      ]),
      s('plague', 2, 2, 'thorns', { per: { dps: RANK_DMG, radius: 0.05 } }, [
        b('miasma', 'Miasma', 2, 'The cloud hangs 3 seconds longer a rank.', { plus: { duration: 3 } }),
        b('contagion', 'Contagion', 1, 'What dies in the cloud bursts into a small cloud of its own.', { set: { contagion: true } }),
      ]),
      s('stoneskin', 3, 0, ['spikes', 'boulder'], { plus: { ward: 0.03, duration: 2 } }, [
        b('stoneshock', 'Stoneshock', 1, 'While it lasts the ground jumps round you every 3 seconds, hurting and throwing back whatever is close.', { set: { pulse: 20 } }),
        b('bedrock', 'Bedrock', 1, 'While it lasts you mend 2 life a second.', { set: { mendRate: 2 } }),
      ]),
      s('vine', 3, 2, ['plague', 'boulder'], { at: { 3: { grab: 1 }, 5: { grab: 1 } }, plus: { root: 0.2 } }, [
        b('strangle', 'Strangle', 2, 'What the vines hold is left rotting, 3 seconds a rank.', { plus: { strangle: 3 } }),
        b('bramble', 'Bramble', 1, 'The vines stay as a patch of bramble for 4 seconds, tearing at and slowing what is in it.', { set: { bramble: 4 } }),
      ]),
      s('quake', 4, 0, 'stoneskin', { per: { radius: 0.05 } }, [
        b('chasm', 'Chasm', 1, 'With its last heave, a spike of stone bursts up under everyone still on it.', { set: { chasm: 45 } }),
        b('rolling', 'Rolling Earth', 2, 'Goes on 2 seconds longer a rank.', { plus: { duration: 2 } }),
      ]),
      s('monolith', 4, 2, ['vine', 'stoneskin'], {}, [
        b('broken', 'Broken Ground', 1, 'The slab goes back down and leaves the ground it broke: for 6 seconds, four paces round, whatever crosses it is slowed.', { set: { rubble: 6 } }),
        b('toppling', 'Toppling', 1, 'The slab falls forward, away from you, and crushes everything along seven paces for three-fifths.', { set: { topple: 0.6 } }),
      ]),
    ],
  },
  {
    key: 'arcane', name: 'Arcane', elem: ARCANE, mastery: 'Arcanist',
    blurb: 'Force, space and time. Arcane finds its own targets, moves you and them about, and rewards setting a fight up.',
    spells: [
      s('missiles', 0, 1, null, { per: { dmg: 0.08 }, plus: { volley: 1, mana: 2, max: 3, every: -0.02 }, at: { 3: { salvo: 1 }, 5: { salvo: 1 } } }, [
        b('arcing', 'Arcing Missiles', 1, 'Where a missile strikes, a spark of it leaps to another foe near for half.', { set: { arc: 0.5 } }),
        b('barrage', 'Barrage', 1, 'Held, the missiles gather and wait. Let go, and all that hang fly at once, each a fifth harder.', { set: { barrage: 0.2 } }),
      ]),
      s('arcaneblast', 1, 0, 'missiles', {}, [
        b('concussion', 'Concussion', 2, 'Hurls them a third further a rank, and leaves them stunned half a second a rank.', { per: { force: 0.35 }, plus: { stun: 0.5 } }),
        b('focused', 'Focused Blast', 1, 'A narrower cone that reaches half again as far and bites a quarter harder.', { per: { range: 0.5, angle: -0.3, dmg: 0.25 } }),
      ]),
      s('blink', 1, 2, 'missiles', { plus: { range: 1.5 } }, [
        b('rift', 'Torn Air', 1, 'Where you left, a rift hangs a moment and then bursts.', { set: { rift: 2.3 } }),
        b('quickstep', 'Quickstep', 2, 'Ready half a second sooner a rank, for 3 less mana.', { plus: { cd: -0.5, mana: -3 } }),
      ]),
      s('blades', 2, 0, 'arcaneblast', { at: { 3: { count: 1 }, 5: { count: 1 } } }, [
        b('whirl', 'Whirling Guard', 1, 'The blades wheel half again as wide, and half again as fast.', { per: { radius: 0.5 }, set: { spin: 1.5 } }),
        b('fling', 'Blade Volley', 1, 'When their time is up, each blade flies at the nearest foe.', { set: { fling: 2.5 } }),
      ]),
      s('rune', 2, 1, ['arcaneblast', 'blink'], {}, [
        b('web', 'Runic Web', 2, 'One more rune may lie at once a rank, each a tenth wider.', { plus: { max: 1 }, per: { radius: 0.1 } }),
        b('binding', 'Binding Rune', 1, 'Whatever the rune catches hangs held for 2 seconds after.', { set: { bind: 2 } }),
      ]),
      s('crescent', 2, 2, 'blink', {}, [
        b('twomoons', 'Two Moons', 1, 'Two crescents, thrown wide of one another, each for 70%.', { set: { twin: true }, per: { dmg: -0.3 } }),
        b('orbit', 'Wide Orbit', 2, '5 paces further and a fifth larger, a rank.', { plus: { out: 5 }, per: { size: 0.2 } }),
      ]),
      s('well', 3, 0, ['blades', 'rune'], { per: { radius: 0.05 } }, [
        b('crush', 'Crushing Depth', 2, 'What it drags is crushed as it goes: 8 a second, a rank.', { plus: { crush: 8 } }),
        b('deepwell', 'Deep Well', 1, 'Holds a second and a half longer, and its burst is two-fifths wider.', { plus: { duration: 1.5 }, set: { wide: 1.4 } }),
      ]),
      s('stasis', 3, 2, ['crescent', 'rune'], { plus: { hold: 0.3 } }, [
        b('echo', 'Second Toll', 1, 'A second after time comes back, it comes back again for half.', { set: { echo: 0.5 } }),
        b('widefield', 'Wide Field', 2, 'A fifth wider a rank.', { per: { zoneR: 0.2 } }),
      ]),
      s('disintegrate', 4, 0, 'well', { plus: { range: 2 } }, [
        b('unmaking', 'Unmaking', 1, 'What it kills comes apart in a burst.', { set: { unmake: 60 } }),
        b('glass', 'Burning Glass', 2, 'Held on, it climbs half as high again a rank.', { plus: { rampMax: 0.75 } }),
      ]),
      s('starfall', 4, 2, 'stasis', { plus: { count: 1 } }, [
        b('guided', 'Guided Stars', 1, 'The stars come down on whoever is in the mark, not where chance puts them.', { set: { guided: true } }),
        b('greatstar', 'The Great Star', 1, 'The last star is a great one: three times the blow, twice as wide.', { set: { nova: 3 } }),
      ]),
    ],
  },
  {
    key: 'lightning', name: 'Lightning', elem: STORM, mastery: 'Stormcaller',
    blurb: 'Speed and spread. Lightning lands the instant it is cast, leaps from one to the next, and leaves them reeling.',
    spells: [
      s('spark', 0, 1, null, { at: { 3: { jumps: 1 }, 5: { jumps: 1 } } }, [
        b('heavy', 'Heavy Stroke', 3, 'Every fifth Spark is a thunderous one, for double, and stuns a moment. A rank brings it one cast sooner.', { plus: { surge: 1 } }),
        b('charged', 'Charged', 1, 'What a Spark strikes is left charged for 4 seconds, and takes a tenth more from every spell.', { set: { shock: 4 } }),
      ]),
      s('chain', 1, 0, 'spark', { at: { 2: { jumps: 1 }, 4: { jumps: 1 } } }, [
        b('longarc', 'Long Arc', 2, 'Leaps 3 paces further and reaches 4 further, a rank.', { plus: { reach: 3, range: 4 } }),
        b('steady', 'Undiminished', 1, 'It loses nothing as it leaps: the last is struck as hard as the first.', { set: { steady: true } }),
      ]),
      s('fork', 1, 1, 'spark', { at: { 3: { forks: 1 }, 5: { forks: 1 } } }, [
        b('branching', 'Branching', 1, 'Each fork leaps on once to another foe, for half.', { set: { branch: 0.5 } }),
        b('widefork', 'Wide Fork', 2, 'A quarter wider and 3 paces further, a rank.', { per: { angle: 0.25 }, plus: { range: 3 } }),
      ]),
      s('seed', 1, 2, 'spark', { plus: { hold: 1 }, per: { relay: 0.08 } }, [
        b('deeproot', 'Long Root', 2, 'Stays 3 seconds longer and reaches a pace further, a rank.', { plus: { hold: 3, reach: 1 } }),
        b('livewire', 'Quickened', 1, 'Whatever bears the seed takes the leap as well, and is left charged: a tenth more from every spell.', { set: { live: true } }),
      ]),
      s('lightning', 2, 0, 'chain', { per: { lash: RANK_DMG } }, [
        b('slowthunder', 'Slow Thunder', 1, 'Lasts 3 seconds longer and lashes 2 paces further.', { plus: { life: 3, lashReach: 2 } }),
        b('thunderhead', 'Thunderhead', 2, 'Bursts a fifth wider a rank, and stuns for half a second a rank.', { per: { radius: 0.2 }, plus: { stun: 0.5 } }),
      ]),
      s('thunderclap', 2, 1, ['chain', 'fork'], { per: { radius: 0.05 } }, [
        b('deafening', 'Deafening', 2, 'Stuns 0.6 of a second longer a rank.', { plus: { stun: 0.6 } }),
        b('shockwave', 'Shockwave', 1, 'Two-fifths wider, and throws them half again as far.', { per: { radius: 0.4, force: 0.5 } }),
      ]),
      s('stormstep', 2, 2, ['fork', 'seed'], { plus: { range: 1.5 } }, [
        b('wake', 'Crackling Wake', 1, 'The way you went stays charged for 3 seconds, and lashes whatever crosses it.', { set: { wake: 3 } }),
        b('arrival', 'Thunderous Arrival', 1, 'The crack as you arrive is four paces wide, and catches everything round the one you came for, for three-fifths.', { set: { arrive: 0.6 } }),
      ]),
      s('thunder', 3, 0, ['lightning', 'thunderclap'], {}, [
        b('twice', 'Twice Struck', 1, 'It strikes the same place again half a second later, for half.', { set: { twice: 0.5 } }),
        b('current', 'Ground Current', 2, 'A quarter wider a rank, and it runs along the ground to two more a rank, for two-fifths.', { per: { radius: 0.25 }, plus: { arcs: 2 } }),
      ]),
      s('staticfield', 3, 2, ['thunderclap', 'stormstep'], { plus: { duration: 1 } }, [
        b('rod', 'Lightning Rod', 2, 'Leaps to one more foe a rank.', { plus: { arcs: 1 } }),
        b('stormrunner', 'Stormrunner', 1, 'Every pulse that finds a foe gives you 2 mana, and while it lasts you move a fifth faster.', { set: { dynamo: 2, haste: 0.2 } }),
      ]),
      s('tempest', 4, 1, ['thunder', 'staticfield'], {}, [
        b('eye', 'Eye of the Storm', 1, 'Three-tenths wider, and the bolts come a quarter faster.', { per: { radius: 0.3, every: -0.25 } }),
        b('front', 'Stormfront', 1, 'The storm drifts after whoever is nearest it.', { set: { drift: 2.5 } }),
      ]),
    ],
  },
  {
    key: 'utility', name: 'Utility', elem: LIGHT, mastery: 'Sage',
    blurb: 'Light, mending and the edge. Little here kills anything: it keeps you standing, moving and stronger while the rest does.',
    spells: [
      s('wisp', 0, 1, null, { plus: { duration: 30 }, per: { glow: 0.1 } }, [
        b('sear', 'Searing Light', 1, 'The wisp burns the nearest foe within 8 paces, every second and a half.', { set: { sear: 14 } }),
        b('lantern', 'Lantern Bearer', 2, 'While it shines your mana comes back a twentieth faster, a rank.', { plus: { font: 0.05 } }),
      ]),
      s('mend', 1, 0, 'wisp', { plus: { amount: 5 } }, [
        b('linger', 'Lingering Mend', 2, 'Goes on mending after: 18 more life over 6 seconds, a rank.', { plus: { linger: 18 } }),
        b('shared', 'Shared Light', 1, 'Mends your company within 10 paces as it mends you, and its light burns whatever stands within 4.', { set: { shared: true, radiant: 30 } }),
      ]),
      s('fleet', 1, 1, 'wisp', { plus: { haste: 0.03, duration: 2 } }, [
        b('slip', 'Slipstream', 1, 'While it lasts, casting does not slow your step.', { set: { slip: true } }),
        b('secondwind', 'Second Wind', 2, 'Ready 3 seconds sooner a rank.', { plus: { cd: -3 } }),
      ]),
      s('turn', 1, 2, 'wisp', { per: { radius: 0.05 }, plus: { rout: 0.2 } }, [
        b('blinding', 'Blinding', 1, 'The living it catches are dazed for 2 seconds, not one.', { set: { daze: 2 } }),
        b('pyre', 'Pyre', 2, 'The dead it turns burn 3 seconds longer a rank.', { plus: { burn: 3 } }),
      ]),
      s('renew', 2, 0, 'mend', { per: { amount: 0.15 } }, [
        b('wellspring', 'Wellspring', 1, 'Brings back 20 mana over its time as well.', { set: { well: 20 } }),
        b('overgrowth', 'Overgrowth', 2, 'Goes on 3 seconds longer a rank, mending as fast all the while.', { plus: { duration: 3 }, per: { amount: 0.3 } }),
      ]),
      s('drain', 2, 1, 'mend', { plus: { heal: 0.05 } }, [
        b('thread', 'Second Thread', 1, 'Threads fasten on the two nearest others as well, for half.', { set: { bond: 2 } }),
        b('tithe', 'Tithe', 2, 'Each bite on the one you hold brings back half a point of mana, a rank.', { plus: { tap: 0.5 } }),
      ]),
      s('aegis', 2, 2, ['fleet', 'turn'], { per: { pool: 0.2 } }, [
        b('reflect', 'Shattering Light', 1, 'When it breaks or runs out it bursts, five paces wide, for what it took and 50 more.', { set: { burstOnEnd: 50 } }),
        b('reserves', 'Thick Shell', 2, 'Lasts 5 seconds longer and takes 15% more, a rank.', { plus: { duration: 5 }, per: { pool: 0.15 } }),
      ]),
      s('sanctuary', 3, 0, ['renew', 'drain'], { plus: { heal: 1 }, per: { radius: 0.05 } }, [
        b('hallowed', 'Hallowed Ground', 1, 'It sears what stands in it three times as hard, and pushes the dead back out.', { set: { hallow: 3 } }),
        b('refuge', 'Refuge', 2, 'Lasts 3 seconds longer a rank, and inside it every blow does 15% less a rank.', { plus: { duration: 3, shelter: 0.15 } }),
      ]),
      s('empower', 3, 2, 'aegis', { plus: { might: 0.03 } }, [
        b('clearmind', 'Clear Mind', 1, 'The spells it strengthens cost a quarter less.', { set: { surge: 0.25 } }),
        b('deepbreath', 'Long Breath', 2, 'One more spell a rank.', { plus: { charges: 1 } }),
      ]),
      s('stillness', 4, 1, ['sanctuary', 'empower'], { plus: { duration: 0.5 } }, [
        b('clearsight', 'Keen Eye', 1, 'While the world is slowed, your spells bite a fifth harder.', { set: { sight: 0.2 } }),
        b('deep', 'Long Stillness', 2, 'Ready 10 seconds sooner a rank.', { plus: { cd: -10 } }),
      ]),
    ],
  },
];

// ---- everything above, by name ----

const INDEX = Object.fromEntries(SPELLS.map((d, i) => [d.key, i]));
/** Every node there is, by id: a spell's key, a branch's `spell:branch`, a mastery's `@tree`. */
export const NODES = {};
TREES.forEach((t, ti) => {
  NODES[`@${t.key}`] = { id: `@${t.key}`, kind: 'mastery', tree: ti, max: MASTERY.max, name: t.mastery,
    desc: `Your ${t.name} spells do ${MASTERY.dmg * 100}% more and cost ${MASTERY.mana * 100}% less mana, a rank. Needs ${MASTERY.needs} points spent in ${t.name}.` };
  for (const n of t.spells) {
    if (!(n.key in INDEX)) throw new Error(`skills: no spell "${n.key}"`);
    Object.assign(n, { id: n.key, kind: 'spell', tree: ti, max: MAX_RANK, spell: INDEX[n.key] });
    NODES[n.id] = n;
    for (const a of n.augs) { a.key = a.id; a.id = `${n.key}:${a.key}`; a.kind = 'branch'; a.tree = ti; a.of = n; NODES[a.id] = a; }
  }
});
/** The spell every tree starts you with, by its place in SPELLS. */
export const STARTERS = TREES.map((t) => t.spells.find((n) => n.tier === 0).spell);
/** The tree a spell stands in, by its place in SPELLS. */
export const TREE_OF = SPELLS.map((d) => NODES[d.key]?.tree ?? -1);
export const TIER_OF = SPELLS.map((d) => NODES[d.key]?.tier ?? 0);

// ---- what's been bought, and what may be ----
//
// ranks: { node id: rank }. A spell is known once its rank is 1 or more. free: the keys of the spells whose first rank cost
// nothing: the six you start with, and any read from a scroll.

export const rankOf = (ranks, id) => ranks?.[id] | 0;
/** The ranks a new game starts with: each school's first spell, at its first rank. */
export const startRanks = () => Object.fromEntries(STARTERS.map((i) => [SPELLS[i].key, 1]));
export const startFree = () => STARTERS.map((i) => SPELLS[i].key);
/** Points spent in all, or in one tree. */
export function spent(ranks, free, tree = -1) {
  let n = 0;
  for (const id in ranks) { const nd = NODES[id]; if (nd && (tree < 0 || nd.tree === tree)) n += ranks[id]; }
  for (const k of free || []) { const nd = NODES[k]; if (nd && rankOf(ranks, k) > 0 && (tree < 0 || nd.tree === tree)) n--; }
  return n;
}

/** Why a point can't go into this node now, or null if it can. */
export function blocked(ranks, free, level, id) {
  const n = NODES[id];
  if (!n) return 'No such thing.';
  const r = rankOf(ranks, id);
  if (r >= n.max) return 'As far as it goes.';
  if (n.kind === 'mastery') return spent(ranks, free, n.tree) - r >= MASTERY.needs ? null : `Needs ${MASTERY.needs} points spent in ${TREES[n.tree].name}.`;
  if (n.kind === 'branch') {
    const name = SPELLS[n.of.spell].name, other = n.of.augs.find((a) => a !== n);
    if (rankOf(ranks, n.of.id) < 1) return `Learn ${name} first.`;
    if (rankOf(ranks, other.id) > 0) return `You took ${other.name}: a spell goes one way or the other.`;
    if (rankOf(ranks, n.of.id) < r + 2) return `Needs ${name} at rank ${r + 2}.`;
    return null;
  }
  if (r > 0) return null;
  if (level < TIER_LEVEL[n.tier]) return `Needs level ${TIER_LEVEL[n.tier]}.`;
  if (n.req.length && !n.req.some((k) => rankOf(ranks, k) > 0)) return `Needs ${n.req.map((k) => SPELLS[INDEX[k]].name).join(' or ')}.`;
  if (spent(ranks, free, n.tree) < TIER_POINTS[n.tier]) return `Needs ${TIER_POINTS[n.tier]} points spent in ${TREES[n.tree].name}.`;
  return null;
}

/** Whether a scroll of spell i can be read at this level: the tier's level, and nothing else. */
export const canRead = (level, i) => level >= TIER_LEVEL[TIER_OF[i]];
/** The spells a scroll can be of. */
export const SCROLLS = SPELLS.map((_, i) => i).filter((i) => TIER_OF[i] >= 1 && TIER_OF[i] < SCROLL_TIERS);

// ---- a spell's numbers, with what's been bought ----

// n: how many times over (a spell's ranks past its first; a branch's ranks). rank: the rank an `at` is measured against.
function apply(def, mod, n, rank) {
  if (n <= 0) return;
  for (const f in mod.per) if (typeof def[f] === 'number') def[f] *= 1 + mod.per[f] * n;
  for (const f in mod.plus) def[f] = (def[f] || 0) + mod.plus[f] * n;
  for (const at in mod.at) if (rank >= +at) for (const f in mod.at[at]) def[f] = (def[f] || 0) + mod.at[at][f];
  if (mod.set) Object.assign(def, mod.set);
}

/** Spell i as it's cast with these ranks: its row, grown by its rank, its branches and its school's mastery. */
export function effective(i, ranks = null) {
  const base = SPELLS[i], node = NODES[base.key], def = { ...base, i, tree: node ? node.tree : -1, rank: 1 };
  if (!node) return def;
  const r = Math.max(1, rankOf(ranks, base.key)), n = r - 1;
  def.rank = r;
  // Each rank past the first: more of what it does, and whatever its row above adds.
  const own = node.up.per || {};
  for (const f of DMG_FIELDS) if (typeof def[f] === 'number' && !(f in own)) def[f] *= 1 + RANK_DMG * n;
  apply(def, node.up, n, r);
  for (const a of node.augs) { const k = rankOf(ranks, a.id); if (k) { apply(def, a, k, k); (def.has ||= {})[a.key] = k; } }
  const m = rankOf(ranks, `@${TREES[node.tree].key}`);
  if (m) {
    for (const f of [...DMG_FIELDS, ...MEND_FIELDS]) if (typeof def[f] === 'number') def[f] *= 1 + MASTERY.dmg * m;
    def.mana *= 1 - MASTERY.mana * m;
    if (def.drain) def.drain *= 1 - MASTERY.mana * m;
  }
  def.mana = Math.max(1, Math.round(def.mana));
  if (def.cd !== undefined) def.cd = Math.max(0, def.cd);
  return def;
}

/** Every spell's numbers for these ranks, by its place in SPELLS. */
export const effectiveAll = (ranks = null) => SPELLS.map((_, i) => effective(i, ranks));

// ---- for the book: what to say about a spell's numbers ----

const secs = (v) => `${+v.toFixed(1)} s`, paces = (v) => `${+v.toFixed(1)} paces`, num = (v) => `${Math.round(v)}`, pct = (v) => `${Math.round(v * 100)}%`;
/** The numbers worth showing, in order: [field, label, how to write it]. */
export const STATS = [
  ['dmg', 'Damage', num], ['dps', 'Damage a second', num], ['lash', 'Lash', num], ['ringDmg', 'Ring of flame', num], ['beamDmg', 'Each beam', num],
  ['shard', 'Each shard', num], ['amount', 'Mends', num], ['pool', 'Takes', num], ['heal', 'Mends', (v) => (v < 2 ? pct(v) : num(v))], ['ward', 'Harm turned', pct], ['might', 'Bites harder by', pct],
  ['charges', 'Spells', num], ['haste', 'Faster by', pct], ['relay', 'Leaps on for', pct], ['radius', 'Radius', paces], ['ring', 'Ring', paces], ['zoneR', 'Radius', paces], ['range', 'Range', paces],
  ['out', 'Flies out', paces], ['reach', 'Reach', paces], ['length', 'Length', paces], ['duration', 'Lasts', secs], ['moat', 'Moat stands', secs], ['hold', 'Holds', secs], ['life', 'Lasts', secs],
  ['freeze', 'Freezes', secs], ['root', 'Holds fast', secs], ['rout', 'Turns the dead', secs], ['chill', 'Slows', secs], ['stun', 'Stuns', secs], ['burn', 'Burns', secs], ['bleed', 'Rots', secs],
  ['shards', 'Shards', num], ['embers', 'Embers', num], ['beams', 'Beams', num], ['count', 'Count', num], ['forks', 'Forks', num], ['jumps', 'Leaps', num], ['arcs', 'Leaps to', num],
  ['grab', 'Seizes', num], ['bounces', 'Bounds', num], ['leaps', 'Brand leaps', num], ['volley', 'Missiles at first', num], ['salvo', 'Fly at a time', num], ['max', 'At most', num],
  ['every', 'One every', (v) => `${+v.toFixed(2)} s`], ['gather', 'Gathers in', secs], ['fuse', 'Fuse', secs], ['mana', 'Mana', num], ['drain', 'Mana a second', num], ['cd', 'Ready again in', secs],
];
/** The lines of a spell's numbers: [label, now, after the next rank (or null where it's the same or there's no next)]. */
export function statLines(i, ranks) {
  const key = SPELLS[i].key, r = rankOf(ranks, key), now = effective(i, ranks);
  const next = r >= 1 && r < MAX_RANK ? effective(i, { ...ranks, [key]: r + 1 }) : null;
  const out = [];
  for (const [f, label, fmt] of STATS) {
    if (typeof now[f] !== 'number') continue;
    const a = fmt(now[f]), z = next && typeof next[f] === 'number' ? fmt(next[f]) : null;
    // (A spell that lasts isn't ready again until that long after it's over.)
    out.push([f === 'cd' && now.cast === 'buff' ? 'Ready again, once it ends, in' : label, a, z && z !== a ? z : null]);
  }
  return out;
}
