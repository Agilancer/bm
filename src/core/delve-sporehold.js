// The Sporehold: the fifth party dungeon, under the Fungal Ring in the Rustwood, for a party of level 11 and up. The ring
// of caps on the hill is only the fruit. What it fruits from is down here: one growth, older than the wood, that has
// hollowed the hill and filled it with itself. Things that wander in are kept. The kobolds it took walk about wearing its
// caps; the wolves it took have moulted; the people it took stand rooted where they stopped, and turn their heads.
//
// Its shape is a trefoil: a great cavern at the hub (the Ring Below) and three leaves off it. The west leaf is long and
// deep: out by the Kennels, down to Mouldfang's den, and back to the hub by the den's own run. The east leaf is short
// and high: the Pod Gardens, Mother Morel's bower, and back. Each leaf is a loop, so nothing is walked twice, and the
// hub is crossed three times and known by the end. The third leaf is the narrow way north, off to one side: the Veil,
// and the Heart behind it, which stays shut until both the others are dead (`needs`).
// Three bosses: Mouldfang (he howls his pack down one of his den's two runs, and marks one of you with the bloom: carry
// it to that run's mouth and the pack comes through it choking), Mother Morel (her pods ripen: stand on them before they
// burst), and the Heart of the Ring (it can't be hurt while its rooted husks feed it).
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it (a cave), src/core/delve-build.js
// builds what's seen (caps the height of a house, shelves of bracket fungus, threads, a violet light with no fire in
// it), src/sim/delve-fights.js has the fights. Everything is local: x east, z south of the way in.
//
// Nobody's letter is on any of it (README "The two sides").
import { C, at, link, niche } from './delve-lay.js';

const rooms = [
  C('sh_sink', 'the Sinkhole', 0, 0, 9, 0, 8, { rock: 'rubble', seam: 'spore:rubble', ground: 'rubble' }),
  C('sh_stair', 'the Root Stair', -16, -50, 12, -4, 9, { rock: 'bark', seam: 'spore:rubble' }),
  C('sh_ring', 'the Ring Below', 0, -125, 25, -9, 20, { ground: 'spore:rubble' }),
  C('sh_kennel', 'the Mould Kennels', -62, -104, 13, -11, 9, { rock: 'pale:rubble', seam: 'spore:rubble', ground: 'spore:stone' }),
  C('sh_den', "Mouldfang's Den", -98, -164, 22, -15, 14, { rock: 'spore:stone', seam: 'pale:rubble', ground: 'pale:rubble' }),
  C('sh_garden', 'the Pod Gardens', 52, -112, 13, -8, 10, { rock: 'mire:rubble', seam: 'spore:rubble', ground: 'mire:stone' }),
  C('sh_bower', "Mother Morel's Bower", 80, -158, 17, -9, 15, { rock: 'mire:stone', seam: 'pale:rubble', ground: 'mire:rubble' }),
  C('sh_veil', 'the Veil', -44, -190, 13, -13, 11, { rock: 'pale:rubble', seam: 'spore:rubble' }),
  C('sh_heart', 'the Heart of the Ring', -30, -254, 28, -17, 24, { flat: true, rock: 'bark', seam: 'spore:rubble', ground: 'spore:stone' }),
];
const tunnels = [
  link(rooms, 'sh_sink', 'sh_stair', -3),
  link(rooms, 'sh_stair', 'sh_ring', 4, 3.4),
  // The west leaf: out by the Kennels (a wide way, and lit), down to the den, and back to the hub by the den's own run,
  // which leaves it a quarter of the way round from where you came in: narrow, and dark.
  link(rooms, 'sh_ring', 'sh_kennel', 3, 4),
  link(rooms, 'sh_kennel', 'sh_den', -6, 3.2),
  { pts: [[-78, -170], [-52, -158], [-20, -136]], w: 2.4, dark: true },
  // The east leaf: the Gardens, the bower, and back the same way about.
  link(rooms, 'sh_ring', 'sh_garden', -3, 4),
  link(rooms, 'sh_garden', 'sh_bower', 5, 3.2),
  { pts: [[66, -166], [44, -158], [20, -136]], w: 2.4, dark: true },
  // The way north: narrow, bent, and off to one side of where the eye goes from the way in.
  link(rooms, 'sh_ring', 'sh_veil', -7, 3),
  link(rooms, 'sh_veil', 'sh_heart', 5, 3.8),
  // The two runs Mouldfang's pack comes down (dead ends off his den): the north run and the west run.
  { pts: [at(rooms, 'sh_den', 0.92, 0), at(rooms, 'sh_den', 1.45, 0)], w: 2, dead: true },
  { pts: [at(rooms, 'sh_den', 0.92, 4.6), at(rooms, 'sh_den', 1.45, 4.6)], w: 2, dead: true },
  // Pockets the growth has eaten out of the rock (nothing in them but the look of them).
  niche(rooms, 'sh_stair', 4.9, 7, 1.6, { rise: 0.8 }),
  niche(rooms, 'sh_kennel', 4.2, 7, 1.6),
  niche(rooms, 'sh_garden', 2.4, 7, 1.6),
  niche(rooms, 'sh_bower', 0.6, 8, 1.7, { rise: 0.6 }),
  niche(rooms, 'sh_veil', 4.7, 6, 1.5),
  niche(rooms, 'sh_heart', 1.2, 9, 2), niche(rooms, 'sh_heart', 5.0, 9, 2),
];
// Rock left standing in Mouldfang's den, to put between you and a pounce.
const pillars = [[-107, -158, 1.5], [-90, -172, 1.4]];
// His two runs, by name: where each comes out into the den (its mouth, a few strides in from the wall) and where the
// pack starts down it (src/sim/delve-fights.js).
export const DEN_RUNS = [
  { name: 'north', warn: 'mou_run_north', mouth: at(rooms, 'sh_den', 0.74, 0), from: at(rooms, 'sh_den', 1.4, 0) },
  { name: 'west', warn: 'mou_run_west', mouth: at(rooms, 'sh_den', 0.74, 4.6), from: at(rooms, 'sh_den', 1.4, 4.6) },
];
// Where the Heart's husks stand rooted, round its room: clear of the way in from the Veil and of the way out.
export const HEART_NODES = [0.8, 1.6, 2.4, 4.3, 5.0, 5.6].map((a) => at(rooms, 'sh_heart', 0.72, a));

// ---- what stands in the rooms (src/core/delve-build.js draws each kind) ----------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
const near = (id, far, a) => at(rooms, id, far, a);
// The sinkhole: the first small caps, and threads down the walls.
add('caps', -5, -3, { n: 5, s: 0.5 }); add('caps', 5.5, 1.5, { n: 4, s: 0.4 });
// The Root Stair: roots through the roof, shelves of bracket to climb down by.
add('roots', -20, -46, { r: 3 }); add('roots', -11, -55, { r: 2.4 });
add('bracket', -25, -54, { yaw: 0.6, n: 4 }); add('bracket', -7, -44, { yaw: 3.6, n: 3 });
add('caps', -14, -59, { n: 5, s: 0.7 });
// The Ring Below: caps the height of a house in a ring, as on the hill over it; the light is theirs. And at each of its
// three ways on, what's down that way: bones to the west, pods to the east, thread to the north.
for (let i = 0; i < 7; i++) { const a = 0.45 + i * 0.898; add('greatcap', Math.round(Math.sin(a) * 15), -125 - Math.round(Math.cos(a) * 15), { h: 7 + (i % 3) * 2, r: 1.1, solid: true, up: 6 + (i % 3) * 2 }); }
add('caps', 0, -125, { n: 7, s: 1 }); add('pool', -6, -131, { r: 4 });
add('husk', 9, -118); add('husk', -8, -137); add('husk', 4, -138);
{ const [x, z] = near('sh_ring', 0.86, 4.98); add('bones', x, z, { r: 2.2 }); add('nest', x + 3, z + 4, { r: 1.4 }); }
{ const [x, z] = near('sh_ring', 0.86, 1.36); add('podbed', x, z, { r: 1.6 }); add('podbed', x - 3, z + 4, { r: 1.3 }); }
{ const [a, b] = [near('sh_ring', 0.72, 5.5), near('sh_ring', 0.72, 5.95)]; add('web', a[0], a[1], { x1: b[0], z1: b[1] }); }
// The Mould Kennels: bones, nests of hair and thread, what the wolves brought in.
add('bones', -66, -98, { r: 2.4 }); add('bones', -56, -110, { r: 2 }); add('nest', -68, -110, { r: 2 }); add('nest', -56, -98, { r: 1.6 });
// Mouldfang's den: his bed of it, the kills hung up to ripen, bones at the mouth of each run.
{ const [x, z] = near('sh_den', 0.62, 3.6); add('nest', x, z, { r: 3.4 }); }
for (const a of [0.9, 3.9, 5.4]) { const [x, z] = near('sh_den', 0.78, a); add('cocoon', x, z); }
for (const r of DEN_RUNS) add('bones', r.mouth[0] + 3, r.mouth[1] + 2.5, { r: 2 });
{ const [x, z] = near('sh_den', 0.8, 2.0); add('caps', x, z, { n: 5, s: 0.8 }); }
// The Pod Gardens: pods in beds, shelves up the walls.
for (const [dx, dz] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) add('podbed', 52 + dx, -112 + dz, { r: 1.8 });
add('bracket', 63, -112, { yaw: 4.7, n: 4 }); add('caps', 44, -104, { n: 6, s: 0.7 });
// Mother Morel's bower: her beds of pods, her kettle, the caps she keeps for herself.
for (const a of [0.7, 2.2, 5.9]) { const [x, z] = near('sh_bower', 0.7, a); add('podbed', x, z, { r: 2 }); }
{ const [x, z] = near('sh_bower', 0.78, 3.14); add('vat', x, z, { r: 1.4, solid: true }); }
{ const [x, z] = near('sh_bower', 0.8, 1.5); add('greatcap', x, z, { h: 6, r: 0.9, solid: true, up: 5 }); }
// The Veil: curtains of thread from roof to floor, the husks of those who came to look.
for (const [x, z, x1, z1] of [[-52, -184, -46, -194], [-36, -184, -41, -195], [-54, -196, -47, -200], [-34, -196, -40, -201]]) add('web', x, z, { x1, z1 });
add('husk', -50, -190); add('husk', -38, -192); add('husk', -44, -198);
// The Heart: the growth itself, come up through the floor behind where it stands; a ring of small caps at every place
// one of its husks roots. (No great caps here: the husks are its ring.)
add('heartroot', -30, -265, { r: 3 });
for (const [x, z] of HEART_NODES) add('rootring', x, z, { r: 1.6 });
for (const a of [1.2, 2.0, 3.0, 3.8, 4.65, 5.3]) { const [x, z] = near('sh_heart', 0.88, a); add('caps', x, z, { n: 6, s: 1.1 }); }

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const SPORELINGS = ['kobold_1', 'kobold_3', 'kobold_armored_1', 'kobold_armored_2', 'kobold_armored_3'];
const SPIDERS = ['spider_black', 'spider_red'];
const HUSKS = ['mannequin_1', 'mannequin_2', 'mannequin_3'];
const HOUNDS = ['sh_hound'];
const BLOOM = ['Sporebloom', 'Sporebloom', 'Corrupted'];
// (tough: a pack's own, where the delve's doesn't suit. ai: how it fights, if not as its kind does: the husks in the hub
// stand still while you look at them, as rooted things would; the ones at the Veil come on regardless.)
const packs = [
  { key: 'sh_stair', room: 'sh_stair', pick: SPORELINGS, n: 5, pal: BLOOM, tough: { hp: 18, damage: 2.5 } },
  { key: 'sh_ring_west', room: 'sh_ring', pick: HUSKS, n: 4, pal: BLOOM, at: [-15, 13], r: 4 },
  { key: 'sh_ring_east', room: 'sh_ring', pick: SPIDERS, n: 5, pal: BLOOM, at: [8, -18], r: 4, tough: { hp: 13, damage: 2 } },
  { key: 'sh_kennel', room: 'sh_kennel', pick: HOUNDS, n: 3, pal: ['Sporebloom'], tough: { hp: 5, damage: 1.5 }, more: { n: 2, pick: HOUNDS, from: at(rooms, 'sh_kennel', 0.7, 4.2), when: 0.6 } },
  { key: 'sh_garden', room: 'sh_garden', pick: SPORELINGS, n: 6, pal: BLOOM, tough: { hp: 17, damage: 2.5 } },
  { key: 'sh_veil', room: 'sh_veil', pick: HUSKS.concat(SPIDERS), n: 5, elite: ['flesh_spider_demon'], pal: BLOOM, ai: 'melee' },
  // (And something on each leaf's way home, so the way round is the same work whichever end it's begun from: hounds in
  // the den's run, sporelings in the bower's. Stood, not walking: the runs are too short between two fights for a beat.)
  { key: 'sh_den_run', room: 'sh_den', pick: HOUNDS, n: 3, pal: ['Sporebloom'], tough: { hp: 6.5, damage: 1.6 }, r: 1.6, at: [52, 10.1] },
  { key: 'sh_bower_run', room: 'sh_bower', pick: SPORELINGS, n: 5, pal: BLOOM, tough: { hp: 17, damage: 2.5 }, r: 1.6, at: [-42, 5.5] },
];
const bosses = [
  { key: 'mouldfang', room: 'sh_den', name: 'Mouldfang', models: ['sh_mouldfang'], pal: ['Sporebloom'], hp: 9000, damage: 60, reach: 3.2, loot: 8 },
  { key: 'morel', room: 'sh_bower', name: 'Mother Morel', models: ['sh_morel'], pal: ['Sporebloom'], hp: 9500, damage: 44, reach: 2.4, loot: 8 },
  { key: 'heart', room: 'sh_heart', name: 'The Heart of the Ring', models: ['sh_heart'], pal: ['Sporebloom'], hp: 14000, damage: 70, reach: 4.4, loot: 0, needs: ['mouldfang', 'morel'], shut: 'hrt_shut' },
];
const warnings = {
  mou_open: 'Mouldfang. He howls his pack down one of his two runs, and marks one of you with the bloom: carry it to that run.',
  mou_pounce: 'Mouldfang crouches: he is coming down the line!',
  mou_rake: 'Mouldfang rakes! Out of the arc.',
  mou_shake: 'Mouldfang shakes out his coat! Step through the ring of spores between two.',
  mou_snap: 'Mouldfang snaps! Out from in front of him.',
  mou_puffs: 'Puffballs burst round you! Out of the circles: the spores hang.',
  mou_run_north: 'Mouldfang howls for his pack: they are coming down the NORTH run! THE BLOOM is on one of you: carry it into the mouth of that run.',
  mou_run_west: 'Mouldfang howls for his pack: they are coming down the WEST run! THE BLOOM is on one of you: carry it into the mouth of that run.',
  mou_choked: 'The pack comes through the bloom choking: only one of them gets out of the run!',
  mou_pack: 'The whole pack is through! Hounds: kill them.',
  mou_turn: 'Mouldfang turns on you! Get behind the tank, or out of his reach, till he lets go.',
  mou_enrage: 'Mouldfang is enraged!',
  mor_open: 'Mother Morel tends her pods. When they ripen, stand on them: a pod trodden flat cannot burst.',
  mor_spores: 'Spores drift after you! Keep moving: they tire.',
  mor_rot: 'Rot blooms under you! Out of it, and stay out: it spreads.',
  mor_roots: 'Roots come up through the floor! Out of their way.',
  mor_ring: 'Rings of spores! Out of them, then step in behind.',
  mor_spit: 'Mother Morel spits! Step between the gobs, and off the puddles.',
  mor_pods: 'PODS RIPEN! Stand on one, each of you, and tread it flat before it bursts!',
  mor_burst: 'A pod bursts! Sporelings spill out of it: kill them.',
  mor_turn: 'Mother Morel turns on you! Get behind the tank till she looks away.',
  mor_enrage: 'Mother Morel is enraged!',
  hrt_shut: 'The Heart is shut. Something at the bottom of the long way down and something at the top of the short way up are keeping it so.',
  hrt_open: 'The Heart of the Ring. It cannot be hurt while its husks feed it: cut down every rooted husk, then strike.',
  hrt_slam: 'The Heart heaves! Step in behind each ring as it lands.',
  hrt_spray: 'The Heart pours out spores! Stand between the streams.',
  hrt_husks: 'The husks lash out with threads! Out of the lines.',
  hrt_creep: 'Rot creeps out under you! Out of it: it spreads.',
  hrt_beams: 'Threads sweep the room! Keep ahead of them, or get out past their ends.',
  hrt_bare: 'The husks are down: the Heart is BARE! Strike it now, before they grow back!',
  hrt_regrow: 'The husks grow back, and one more with them. Cut them down again.',
  hrt_turn: 'The Heart reaches for you! Out of its reach till it lets go.',
  hrt_enrage: 'The Heart is enraged: it will take you all!',
};

export const SPOREHOLD = {
  key: 'sporehold', tag: 'sh', name: 'The Sporehold', short: 'the Sporehold', x: 2900, z: -5760, y: -60, level: 11, style: 'cave',
  rooms, tunnels, pillars, props, packs, bosses, warnings,
  turnWarn: { mouldfang: 'mou_turn', morel: 'mor_turn', heart: 'hrt_turn' },
  entry: { x: 0, z: 3, yaw: Math.PI }, exitIn: { x: 0, z: 6.5 }, exitOut: { x: -30, z: -277 },
  // On the hill beside the Fungal Ring (SITES.fungus), facing the ring.
  portal: { x: 2861, z: -4290, yaw: 1.82, r: 2.2 },
  last: 'heart', tough: { hp: 9, damage: 1.7 }, pay: { xp: 3000, gold: 480 },
  names: { Kobolds: 'SPORELING', 'Giant Spiders': 'CAP SPIDER', 'Haunted Mannequins': 'ROOTED HUSK', Werewolf: 'MOULD HOUND', 'Plague Giants': 'BLOAT-CAP' },
  look: { wall: 'spore:rubble', floor: 'spore:rubble', roof: 'spore:stone', spike: 'spore:rubble', stone: 'spore:rubble', flame: 'spore:flame', lamp: 'cap', still: true, light: [0.74, 0.5, 1], fire: [0.6, 0.9, 1], every: 8, lit: 0.5 },
  words: { enter: 'The Sporehold. The ring on the hill is only the fruit: this is what it fruits from.', clear: 'The Sporehold is cleared. The Heart of the Ring is dead!', wipe: 'Your party falls... and wakes in the Sinkhole.' },
};
