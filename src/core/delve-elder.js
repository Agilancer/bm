// The Elder Dragon Gods: the eighth party dungeon, for a party of level 100 and up (docs/ELDER-DRAGONS.md). Not a cave:
// islands broken off the world, hanging in a purple nebula round a black hole, the Maw. Its door is in the caldera of the
// Sorrowhorn, under the Crown of Teeth: the black teeth standing round the frozen lake up there are Nihvaroth's, and the
// other three gods were its teeth too.
//
// Its shape is a chain and a hub. In from the portal on the Threshold; down the Whelp Bridge, past the Span, to the Shard
// Garden; on to the Scale Altar, the hub, where four bridges go out to four islands, each sealed till the god before it is
// dead: west to the Galeward (Thyrraxis, the green), east to the Cinderwell (Kaldurra, the red), north-west to the
// Rimespire (Morvekh, the undead) and north to the Lip of the Maw (Nihvaroth, the black). A drake keeps each bridge's far end.
//
// The engine's 'void' style (src/core/dungeon.js): a room is an island and a passage a bridge, and where there's neither
// is the void, not rock. Its edges hold whoever walks; whoever jumps can go over them, and whoever falls is thrown back up
// by the Rift onto the ground they last stood on, a fifth of their life the poorer (src/sim/dungeon.js voidStep). Some
// islands can't be walked to: those are `leap`, reached by a jump or a gust stone (LEAPS below: stepped on, it throws you
// across). A dais here is a pillar's top: stood out of the floor as a step, not a slope, so it has to be jumped onto.
//
// This is its layout only, as plain data: src/core/dungeon.js makes the field of it, src/core/delve-build.js builds what's
// seen (voidShell: island tops, cliffs, the long roots under them), src/sim/elder-fights.js has the four fights. Everything
// is local: x east, z south of the way in; y over the delve's own height.
//
// Nobody's letter is on any of it (README "The two sides"): it's older than both.
import { C } from './delve-lay.js';

const TAU = Math.PI * 2;
const r1 = (v) => Math.round(v * 10) / 10;
// A point so far from (cx, cz) at angle a (0 north, turning east).
const polar = (cx, cz, r, a) => [r1(cx + Math.sin(a) * r), r1(cz - Math.cos(a) * r)];
const deg = (a) => a * Math.PI / 180;

// ---- where everything is -----------------------------------------------------------------------------------------------
export const GALE = { x: -152, z: -214, r: 30, y: 6 };          // the Galeward's disc
export const CINDER = { x: 160, z: -214, r: 40, y: 4, vent: 7 }; // the Cinderwell's ring, round its vent
export const RIME = { x: -124, z: -374, ring: 27, y: 30 };       // the Rimespire: the summit's middle, the ramp's radius
export const MAW = { x: 24, z: -384, r: 46, y: 2 };              // the Lip of the Maw
// Which way the Maw is, from anywhere in here (the black hole in the sky: src/gfx/shaders.js VOID_SKY). Down and north.
export const MAW_DIR = (() => { const v = [0.12, -0.34, -1], L = Math.hypot(...v); return v.map((q) => q / L); })();
// Where the delve is in the world (its def below), and each god's island's own light: what the void's violet becomes over
// it (src/gfx/shaders.js voidTint), full over the island and gone 30 m out. The Galeward a cold storm teal, the Cinderwell
// an ember underlight, the Rimespire ice blue, the Lip near-black, its violet drained.
export const ELDER_AT = { x: 6400, z: 6500 };
export const VOID_TINTS = [
  { x: GALE.x, z: GALE.z + 6, r: 52, key: [0.62, 1.02, 1.12], amb: [0.6, 1.05, 1.1] },
  { x: CINDER.x, z: CINDER.z, r: 44, key: [1.75, 0.82, 0.42], amb: [1.6, 0.7, 0.36] },
  { x: RIME.x + 6, z: RIME.z - 4, r: 42, key: [0.72, 0.98, 1.5], amb: [0.7, 1.0, 1.5] },
  { x: MAW.x, z: MAW.z, r: 50, key: [0.78, 0.6, 0.86], amb: [0.42, 0.36, 0.52] },
].map((t) => ({ ...t, x: ELDER_AT.x + t.x, z: ELDER_AT.z + t.z }));

// The Galeward's four pylons, at its quarters (what the gale can't reach behind: their lee).
export const PYLONS = [45, 135, 225, 315].map((a) => polar(GALE.x, GALE.z, 19, deg(a)));
// Its islets: three below its western rim, where Storm Nova throws you, and two higher, east and west of the way in.
export const GALE_ISLES = [
  // (Wide enough for him to come down on: he's half again the pylons' height.)
  { id: 'ed_gale_isle1', a: 200, far: 50, r: 12, y: -14 },
  { id: 'ed_gale_isle2', a: 262, far: 50, r: 13, y: -12 },
  { id: 'ed_gale_isle3', a: 324, far: 50, r: 12, y: -15 },
].map((s) => ({ ...s, at: polar(GALE.x, GALE.z, s.far, deg(s.a)) }));
// The Cinderwell's basalt pillars: a ring of them each side of the way round, near enough to jump between (8.5 to 10 m
// between their middles, a running jump between their edges), standing a step and a half out of the floor.
export const BASALT = [];
for (const [rad, n, off] of [[14, 7, 0], [23.5, 12, 15], [32.5, 16, 0]]) for (let i = 0; i < n; i++) {
  const a = deg(off) + i / n * TAU;
  // (Not on the way in from the bridge: its mouth, due west.)
  if (Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < 0.32 && rad > 20) continue;
  BASALT.push([...polar(CINDER.x, CINDER.z, rad, a), 2.5]);
}
export const BASALT_UP = 1.5;
// The Rimespire's ramp: four ledges round its south and west sides at the ramp's radius, the summit in the middle, and the
// three islets on its open east side where Morvekh's claws go in at the end.
export const RIME_LEDGES = [
  { id: 'ed_rime0', name: 'the Foot of the Rime', a: 135, y: 2 },
  { id: 'ed_rime1', name: 'the First Shelf', a: 195, y: 9 },
  { id: 'ed_rime2', name: 'the Second Shelf', a: 255, y: 16 },
  { id: 'ed_rime3', name: 'the Last Shelf', a: 315, y: 24 },
].map((l) => ({ ...l, at: polar(RIME.x, RIME.z, RIME.ring, deg(l.a)) }));
export const RIME_ISLES = [15, 60, 105].map((a, i) => ({ id: `ed_rime_isle${i + 1}`, a, at: polar(RIME.x, RIME.z, 34, deg(a)), r: 6.5, y: 26 }));
// The Lip's two islets, out over the Maw, and where its eight stars go round over it (src/sim/elder-fights.js moves them).
export const MAW_ISLES = [
  { id: 'ed_maw_isle1', a: -48, far: 63.5, r: 10, y: 5 },
  { id: 'ed_maw_isle2', a: 48, far: 63.5, r: 10, y: 8 },
].map((s) => ({ ...s, at: polar(MAW.x, MAW.z, s.far, deg(s.a)) }));
export const STARS = { n: 8, r: 30, spin: 0.05 };
// The Scale Altar, and the four stairs off it (each the near end of a god's bridge).
export const ALTAR = { x: 0, z: -214, r: 24 };
const GATES = { thyrraxis: [-84, -214], kaldurra: [84, -214], morvekh: [-62, -292], nihvaroth: [6, -296] };
// The bridges out of the Scale Altar, each sealed till the god before it is dead (by its key; the first is open): across
// the bridge's mouth on the altar's own rim, two metres in from its edge. (yaw: so across is the way's square, as
// src/core/delve-build.js voidseal has it.)
export const SEALS = [['thyrraxis', null], ['kaldurra', 'thyrraxis'], ['morvekh', 'kaldurra'], ['nihvaroth', 'morvekh']].map(([key, after]) => {
  const [gx, gz] = GATES[key], dx = gx - ALTAR.x, dz = gz - ALTAR.z, L = Math.hypot(dx, dz), hx = dx / L, hz = dz / L;
  return { key, after, at: [r1(ALTAR.x + hx * (ALTAR.r - 2)), r1(ALTAR.z + hz * (ALTAR.r - 2))], yaw: Math.atan2(-hx, -hz) };
});

// ---- the islands ---------------------------------------------------------------------------------------------------------
// (rock: an island's own stone, cliff: what its sides are, ground: its top. Its underside hangs `root` metres below it.)
const V = { rock: 'void:rubble', ground: 'void:stone' };
const rooms = [
  C('ed_threshold', 'the Threshold', 0, 0, 15, 0, 0, { ...V, root: 26 }),
  C('ed_span', 'the Span', 0, -62, 8, -3, 0, { ...V, root: 14 }),
  C('ed_shards', 'the Shard Garden', -8, -128, 22, -6, 0, { rock: 'void:rubble', ground: 'void:course', root: 34, shards: true }),
  C('ed_altar', 'the Scale Altar', ALTAR.x, ALTAR.z, ALTAR.r, -2, 0, { rock: 'void:block', ground: 'void:flags', root: 38, flat: true }),
  // The bridge-heads: a drake on each.
  C('ed_galegate', 'the Gale Stair', ...GATES.thyrraxis, 9, 2, 0, { ...V, root: 16 }),
  C('ed_cindergate', 'the Ash Stair', ...GATES.kaldurra, 9, 2, 0, { rock: 'dark:rubble', ground: 'dark:rubble', root: 16 }),
  C('ed_rimegate', 'the Rime Stair', ...GATES.morvekh, 9, 2, 0, { rock: 'frost:rubble', ground: 'frost:stone', root: 16 }),
  C('ed_mawgate', 'the Last Stair', ...GATES.nihvaroth, 9, 0, 0, { ...V, root: 16 }),
  // The four.
  // (Each its own stone: the Galeward dark slate, the Cinderwell black basalt, the Rimespire's ice over dark rock, the Lip
  // black flags; the light over each, VOID_TINTS, does the rest.)
  C('ed_galeward', 'the Galeward', GALE.x, GALE.z, GALE.r, GALE.y, 0, { rock: 'dark:stone', ground: 'dark:flags', root: 60, flat: true }),
  ...GALE_ISLES.map((s, i) => C(s.id, `the ${['Low', 'Lee', 'Last'][i]} Islet`, s.at[0], s.at[1], s.r, s.y, 0, { rock: 'dark:stone', ground: 'dark:course', root: 18, leap: true })),
  C('ed_cinderwell', 'the Cinderwell', CINDER.x, CINDER.z, CINDER.r, CINDER.y, 0, { rock: 'dark:rubble', ground: 'dark:stone', root: 70, magma: true, hole: CINDER.vent }),
  // (The Rimespire's ground dark slate under its ice-blue light: Morvekh's frost is white, and has to show on it.)
  ...RIME_LEDGES.map((l) => C(l.id, l.name, l.at[0], l.at[1], 7, l.y, 0, { rock: 'dark:rubble', ground: 'dark:stone', root: 10 })),
  C('ed_summit', 'the Rimespire', RIME.x, RIME.z, 12, RIME.y, 0, { rock: 'dark:rubble', ground: 'dark:flags', root: 110, spire: true, flat: true }),
  ...RIME_ISLES.map((s, i) => C(s.id, `the ${['North', 'East', 'South'][i]} Claw`, s.at[0], s.at[1], s.r, s.y, 0, { rock: 'dark:rubble', ground: 'dark:stone', root: 12, leap: true })),
  C('ed_maw', 'the Lip of the Maw', MAW.x, MAW.z, MAW.r, MAW.y, 0, { rock: 'dark:rubble', ground: 'dark:flags', root: 90, flat: true, cracks: true }),
  ...MAW_ISLES.map((s, i) => C(s.id, `the ${['Left', 'Right'][i]} Hand`, s.at[0], s.at[1], s.r, s.y, 0, { rock: 'dark:rubble', ground: 'dark:ashlar', root: 20, leap: true })),
];
const byId = (id) => rooms.find((r) => r.id === id);
// A bridge between two islands: straight, from inside the edge of one to inside the edge of the other (w: half its width).
// (bend: its middle pushed so far to the left of the way from a to b, as you'd walk it.)
function bridge(a, b, w = 2.6, bend = 0, o = {}) {
  const A = byId(a), B = byId(b);
  const dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
  const p0 = [A.x + ux * (A.r - 2.5), A.z + uz * (A.r - 2.5)], p1 = [B.x - ux * (B.r - 2.5), B.z - uz * (B.r - 2.5)];
  const pts = [p0];
  if (bend) pts.push([(p0[0] + p1[0]) / 2 + uz * bend, (p0[1] + p1[1]) / 2 - ux * bend]);
  pts.push(p1);
  return { pts: pts.map(([x, z]) => [r1(x), r1(z)]), w, bridge: true, ...o };
}
// The ramp round the Rimespire: from one ledge to the next round the ramp's circle, a point every twenty degrees.
function ramp(a, b) {
  const A = RIME_LEDGES.find((l) => l.id === a), B = RIME_LEDGES.find((l) => l.id === b), pts = [];
  for (let g = A.a + 8; g <= B.a - 8 + 1e-6; g += (B.a - A.a - 16) / 3) pts.push(polar(RIME.x, RIME.z, RIME.ring, deg(g)));
  return { pts, w: 2.6, bridge: true, ramp: true };
}
const tunnels = [
  bridge('ed_threshold', 'ed_span', 2.4, 3),
  bridge('ed_span', 'ed_shards', 2.4, -4),
  bridge('ed_shards', 'ed_altar', 2.8, 3),
  bridge('ed_altar', 'ed_galegate', 2.6), bridge('ed_galegate', 'ed_galeward', 2.8),
  bridge('ed_altar', 'ed_cindergate', 2.6), bridge('ed_cindergate', 'ed_cinderwell', 2.8),
  bridge('ed_altar', 'ed_rimegate', 2.6), bridge('ed_rimegate', 'ed_rime0', 2.6, 4),
  ramp('ed_rime0', 'ed_rime1'), ramp('ed_rime1', 'ed_rime2'), ramp('ed_rime2', 'ed_rime3'),
  bridge('ed_rime3', 'ed_summit', 2.4),
  bridge('ed_altar', 'ed_mawgate', 2.6), bridge('ed_mawgate', 'ed_maw', 3),
];
// Holes in the islands (local x, z, radius): the void showing through. The Cinderwell's vent goes down through its middle.
const pillars = [[CINDER.x, CINDER.z, CINDER.vent]];
// The Cinderwell's pillars' tops.
const daises = BASALT.map(([x, z, r]) => ({ x, z, r, dy: BASALT_UP, step: true }));

// ---- the gust stones: stepped on, they throw you across to their other end -------------------------------------------------
// [from x, z, to x, z] local, each both ways unless one: true. The islets nobody walks to are reached by these, or a jump.
const toward = (id, from, inset = 3) => { const r = byId(id), dx = from[0] - r.x, dz = from[1] - r.z, L = Math.hypot(dx, dz) || 1; return [r1(r.x + dx / L * (r.r - inset)), r1(r.z + dz / L * (r.r - inset))]; };
const pair = (a, b, o = {}) => { const A = byId(a), B = byId(b); return { from: toward(a, [B.x, B.z]), to: toward(b, [A.x, A.z]), ...o }; };
export const LEAPS = [
  // (The Galeward's islets up onto the disc: its updrafts. Only up: Storm Nova is the way down. And between them.)
  ...GALE_ISLES.map((s) => ({ ...pair(s.id, 'ed_galeward'), one: true, gust: true, at: 'thyrraxis' })),
  pair('ed_gale_isle1', 'ed_gale_isle2', { at: 'thyrraxis' }), pair('ed_gale_isle2', 'ed_gale_isle3', { at: 'thyrraxis' }),
  // (The Rimespire's summit out to each claw, and claw to claw.)
  ...RIME_ISLES.map((s) => pair('ed_summit', s.id, { at: 'morvekh' })),
  pair('ed_rime_isle1', 'ed_rime_isle2', { at: 'morvekh' }), pair('ed_rime_isle2', 'ed_rime_isle3', { at: 'morvekh' }),
  // (The Lip out to its two hands.)
  ...MAW_ISLES.map((s) => pair('ed_maw', s.id, { at: 'nihvaroth' })),
];

// ---- what stands on the islands (src/core/delve-build.js draws each kind) --------------------------------------------------
const props = [];
const add = (kind, x, z, o = {}) => props.push({ kind, x, z, ...o });
// The Threshold: the broken arch the portal stands in, crystals, and the first view of all of it.
add('voidarch', 0, 13.5, { w: 4.4, h: 6 });
for (const [x, z, h] of [[-10, -4, 3.2], [9, 2, 2.4], [-6, 8, 1.8], [11, -7, 2.8]]) add('voidcrystal', x, z, { h, r: 0.5 });
// The Span: a stone where the bridge was mended, an old banner pole leaning.
add('scalestone', -4.5, -62, { r: 0.9, h: 2.4 }); add('scalestone', 4.6, -60, { r: 0.7, h: 1.6 });
// The Shard Garden: crystal grown out of everything, clusters to fight round.
for (let i = 0; i < 14; i++) {
  const a = i * 2.39996, r = 6 + (i * 7.3) % 13, [x, z] = polar(-8, -128, r, a);
  add('voidcrystal', x, z, { h: 2.2 + (i % 4) * 1.3, r: 0.45 + (i % 3) * 0.2, cluster: i % 2 === 0 });
}
// The Scale Altar: four great scales stood up round its middle, one in each god's colour, and the altar.
add('scalealtar', 0, -214, { r: 4.5 });
for (const [k, a] of [['green', 270], ['red', 90], ['undead', 315], ['black', 0]]) { const [x, z] = polar(0, -214, 12, deg(a)); add('scalestone', x, z, { r: 1.2, h: 4.6, god: k, yaw: deg(a) }); }
// Its seals, across the four bridges' mouths: scenery that goes when the god before it dies (src/sim/dungeon.js flip).
for (const s of SEALS) add('voidseal', s.at[0], s.at[1], { w: 3.4, h: 5.2, yaw: s.yaw, key: s.key, open: !s.after });
// The Galeward: four lightning pylons, rings of iron round their heads; its rim cut in steps.
PYLONS.forEach(([x, z], n) => add('pylon', x, z, { r: 1.7, h: 11, solid: true, n }));
// The Cinderwell: the vent, glowing; its pillars of basalt; slag heaps at the ring's edge.
add('vent', CINDER.x, CINDER.z, { r: CINDER.vent });
BASALT.forEach(([x, z, r], n) => add('basalt', x, z, { r, up: BASALT_UP, n }));
// The Rimespire: rime crystals on every ledge (what holds you against the Grasp), the spire's ice going up behind.
// (Two to each shelf, either end of it, so a party of five isn't all at one crystal; one by the Rime Stair's drake.)
for (const l of RIME_LEDGES) for (const s of [90, 270]) { const [x, z] = polar(l.at[0], l.at[1], 3.6, deg(l.a + s)); add('rime', x, z, { r: 0.7, h: 3.2 }); }
add('rime', GATES.morvekh[0] + 4.5, GATES.morvekh[1] + 2.5, { r: 0.7, h: 3.2 });
for (const a of [0, 120, 240]) { const [x, z] = polar(RIME.x, RIME.z, 7.5, deg(a + 20)); add('rime', x, z, { r: 0.8, h: 3.8 }); }
for (const s of RIME_ISLES) add('rime', s.at[0], s.at[1], { r: 0.9, h: 4.2, claw: true });
// The Lip of the Maw: the accretion ring's rubble round its edge; star-sockets where its stars go round.
add('accretion', MAW.x, MAW.z, { r: MAW.r });
add('voidcracks', MAW.x, MAW.z + 6, { n: 6, w: 22, len: MAW.r + 8 });
// The gust stones, where each leap begins.
LEAPS.forEach((l, n) => { add('guststone', l.from[0], l.from[1], { r: 1.3, n, gust: !!l.gust }); if (!l.one) add('guststone', l.to[0], l.to[1], { r: 1.3, n, back: true }); });

// ---- who's in it ----------------------------------------------------------------------------------------------------------
const WHELPS = ['dragonling_black', 'dragonling_undead'];
const STAR = ['Amethyst', 'Gloam', 'Stormhide'];
const packs = [
  // (Up over the sides of the Whelp Bridge, onto the Span.)
  { key: 'ed_span', room: 'ed_span', pick: WHELPS, n: 4, pal: STAR, at: [0, 0], r: 3 },
  { key: 'ed_shards_west', room: 'ed_shards', pick: WHELPS, n: 4, pal: STAR, at: [-12.5, 7], r: 3 },
  { key: 'ed_shards_east', room: 'ed_shards', pick: WHELPS, n: 4, pal: STAR, at: [12.5, 7], r: 3 },
  { key: 'ed_shards_drake', room: 'ed_shards', pick: ['ed_drake_green'], n: 1, elite: WHELPS, pal: ['Base'], at: [0, -14.5], r: 4, tough: { hp: 30, damage: 2.6 } },
  // A drake at each bridge's far end.
  { key: 'ed_galegate', room: 'ed_galegate', pick: ['ed_drake_green'], n: 1, elite: WHELPS, pal: ['Base'], at: [0, 0], r: 3, tough: { hp: 30, damage: 2.6 } },
  { key: 'ed_cindergate', room: 'ed_cindergate', pick: ['ed_drake_red'], n: 1, elite: WHELPS, pal: ['Base'], at: [0, 0], r: 3, tough: { hp: 32, damage: 2.7 } },
  { key: 'ed_rimegate', room: 'ed_rimegate', pick: ['ed_drake_undead'], n: 1, elite: WHELPS, pal: ['Base'], at: [0, 0], r: 3, tough: { hp: 34, damage: 2.8 } },
  { key: 'ed_mawgate', room: 'ed_mawgate', pick: ['ed_drake_black'], n: 1, elite: WHELPS, pal: ['Base'], at: [0, 0], r: 3, tough: { hp: 36, damage: 2.9 } },
];
const bosses = [
  // (arena: how far from its room's middle the fight goes on, its islets with it. pull: how near you come before it wakes.
  // Morvekh is met perched on the ramp's first shelf: the fight's a climb from there to the summit.)
  { key: 'thyrraxis', room: 'ed_galeward', name: 'Thyrraxis, the Gale Eternal', models: ['ed_thyrraxis'], pal: ['Base'], hp: 122000, damage: 330, reach: 11, loot: 8, at: [0, -6], arena: 95 },
  { key: 'kaldurra', room: 'ed_cinderwell', name: 'Kaldurra, the Hearth of the World', models: ['ed_kaldurra'], pal: ['Base'], hp: 120000, damage: 335, reach: 11.5, loot: 8, needs: ['thyrraxis'], shut: 'kal_shut', at: [12, 0], arena: 52 },
  { key: 'morvekh', room: 'ed_rime1', name: 'Morvekh, Who Remembers the Cold', models: ['ed_morvekh'], pal: ['Base'], hp: 112000, damage: 330, reach: 11, loot: 8, needs: ['kaldurra'], shut: 'mor_shut', at: [0, 0], arena: 72, pull: 24 },
  { key: 'nihvaroth', room: 'ed_maw', name: 'Nihvaroth, the Hollow Star', models: ['ed_nihvaroth'], pal: ['Base'], hp: 150000, damage: 350, reach: 13.5, loot: 0, needs: ['morvekh'], shut: 'nih_shut', at: [0, -14], arena: 84 },
];
// What the fights call out (src/sim/elder-fights.js). A god's own words are its lines, said as subtitles: LINES below.
const warnings = {
  ed_under: 'You are under the hundredth winter. The gods see it: they hit harder, and they are harder to kill.',
  ed_span: 'Whelps come up over the bridge\'s edges!',
  ed_drake_gale: 'The drake beats its wings: hold your ground away from the edge, or be blown off!',
  ed_drake_wave: 'The drake smashes the stair: jump the lava wave!',
  ed_drake_grasp: 'The drake\'s grasp drags you toward the edge! Hold to the rime.',
  ed_drake_pull: 'The drake pulls toward the Maw! Into the well of light.',
  // Thyrraxis
  thy_open: 'Thyrraxis, the Gale Eternal. When it beats its wings, get behind a pylon: the gale throws whoever is in the open off the disc.',
  thy_gale: 'GALE! Get in the lee of a pylon, behind it from the dragon!',
  thy_squall: 'A squall line sweeps the disc! Find the gap in it.',
  thy_breath: 'Thyrraxis breathes lightning across the disc! Out of the arc.',
  thy_conduit: 'Thyrraxis charges a pylon! Stand in its ring to drain it, or that quarter of the disc burns to the end.',
  thy_overload: 'A pylon overloads: its quarter of the disc is live from now on.',
  thy_nova: 'STORM NOVA! It throws you off the disc: you come down on the islets below.',
  thy_elementals: 'Storm whelps come down onto the islets! Kill them.',
  thy_strafe: 'Thyrraxis strafes an islet! Out of the strip.',
  thy_updraft: 'Updrafts on the islets! Step into a gust stone to go back up.',
  thy_rings: 'Tempest Wing: rings of wind roll out! Jump each one.',
  thy_spark: 'A spark is on you! Carry it to the rim, away from the others.',
  thy_spark_other: 'A spark is on one of you! Keep away from them.',
  thy_break: 'THE DISC BREAKS! Its middle is live from now on: keep to the rim.',
  thy_clouds: 'Lightning clouds gather over an islet! Jump to another.',
  thy_lands: 'Thyrraxis lands on an islet: that is where it can be hurt.',
  thy_turn: 'Thyrraxis turns on you! Get behind the tank, out of its reach.',
  thy_enrage: 'The storm has no end: Thyrraxis is enraged.',
  // Kaldurra
  kal_shut: 'The seal on the eastern bridge holds. The Gale Eternal still blows over the west: Thyrraxis first.',
  kal_open: 'Kaldurra, the Hearth of the World. Jump her lava waves, keep ahead of the wildfire; when the caldera floods, get up on the pillars.',
  kal_smash: 'Claw Smash! Three lava waves roll out from the blow: jump them.',
  kal_wildfire: 'Wildfire advances across the ring! Keep on the far side of it.',
  kal_meteor: 'A living meteor rolls after one of you! Lead it round the ring, away from the others.',
  kal_flood: 'MOLTEN FLOOD! The caldera floods: up onto the basalt pillars, and hop between them.',
  kal_ebb: 'The lava falls. Rings of fire cross the floor: jump them as they reach you.',
  kal_seeds: 'Ember flowers open about the ring! Get into one before she roars, two to a flower.',
  kal_roar: 'APOCALYPSE ROAR! Into a flower, now: whoever is outside one burns.',
  kal_run: 'Kaldurra runs the length of the ring, breathing! Out of the line.',
  kal_crash: 'Kaldurra crash-lands, winded! She takes double damage: everything on her.',
  kal_turn: 'Kaldurra turns on you! Get behind the tank, out of her reach.',
  kal_enrage: 'The hearth burns everything at the last: Kaldurra is enraged.',
  // Morvekh
  mor_shut: 'The seal on the north-west bridge holds. The Hearth of the World still burns in the east: Kaldurra first.',
  mor_open: 'Morvekh, Who Remembers the Cold. He climbs, and you follow: up the ramp, ahead of the mist. Stand by a rime crystal when the grave reaches up.',
  mor_climb: 'Morvekh flies higher! Up the ramp after him, ahead of the freezing mist.',
  mor_mist: 'The freezing mist rises over the shelf below. Keep climbing.',
  mor_breath: 'Frost breath! Out of the cone: what it leaves behind freezes you.',
  mor_grasp: 'GRASP OF THE GRAVE! Chains drag you to the edge: stand by a rime crystal.',
  mor_bombs: 'FROST BOMBS fall on each of you in turn! Keep moving, and apart.',
  mor_deep: 'Deep breath! A white line across the summit: get out of it.',
  mor_whelps: 'Undead dragonlings climb out of the ice! Kill them.',
  mor_zero: 'ABSOLUTE ZERO! Morvekh hangs from the spire: jump out to the claws and stand in each grip to break it.',
  mor_grip: 'A claw lets go!',
  mor_fall: 'His last grip breaks: Morvekh falls onto the summit. Burn him.',
  mor_zero_fail: 'Too slow: the cold takes everyone. Morvekh comes down onto the summit whole.',
  mor_shards: 'Ice comes down off the spire beside the grips! Step round the ring.',
  kal_sink: 'Her breath melts a pillar: its top is molten for the rest of the fight. One fewer to stand on.',
  nih_echo_gale: 'The Echo of Thyrraxis beats its wings! Onto the star core, or be blown off the hand.',
  nih_echo_rings: 'The Echo of Thyrraxis: rings of wind! Jump each one.',
  nih_echo_smash: 'The Echo of Kaldurra smashes the hand! Jump the lava waves.',
  nih_echo_meteor: 'The Echo of Kaldurra looses a living meteor! Lead it round the hand.',
  nih_strafe: 'Nihvaroth breathes down the hand! Out of the strip.',
  nih_echo_undead: 'The Echo of Morvekh rises out of the Lip! Break it: its frost finds you while it stands.',
  mor_turn: 'Morvekh turns on you! Get behind the tank, out of his reach.',
  mor_enrage: 'The cold remembers everything: Morvekh is enraged.',
  // Nihvaroth
  nih_shut: 'The seal on the northern bridge holds. The cold still keeps the Rimespire: Morvekh first.',
  nih_open: 'Nihvaroth, the Hollow Star. When it devours, get into a star well. Stand under whoever floats. The other three were its teeth.',
  nih_devour: 'DEVOUR! Everything is pulled toward the Maw: into a star well!',
  nih_float: 'One of you floats toward the Maw! Stand under them to pull them down.',
  nih_spheres: 'Void spheres land! Stand in them to drain them before they burst.',
  nih_swallow: 'THE SWALLOW! The Lip goes dark: you are thrown out to its hands.',
  nih_echo: 'An echo of a god it ate! Stand on the star core to break its shield.',
  nih_cosmos: 'Devouring Cosmos eats the hand from its outer side! Keep ahead of it.',
  nih_fling: 'The hand closes: you are flung across to the other.',
  nih_back: 'Back on the Lip! If both echoes broke, the star cores you carried will stun it.',
  nih_stunned: 'Nihvaroth is destabilized! Everything on it.',
  nih_nova: 'Supernova: a star goes out. Fewer wells now.',
  nih_ring: 'The accretion ring closes in!',
  nih_last: 'The ring has closed. This Devour is the last: its wells close and its stars go out. Kill it before they do.',
  nih_turn: 'Nihvaroth turns on you! Get behind the tank, out of its reach.',
  nih_enrage: 'Nothing is left but hunger: Nihvaroth is enraged.',
  // Everywhere: the fall.
  ed_fall: 'The Rift throws you back up. It hurts.',
  ed_sealed: 'The seal holds. Its god waits on the one before.',
};

// What the gods say, as subtitles over the fight (docs/ELDER-DRAGONS.md: recorded once the owner approves a voice for each).
// By god, then by when; a list is said one at a time, in turn.
export const LINES = {
  thyrraxis: {
    intro: ['Small things, crossing my sky on a thread of stone. Do you know how far down the bottom is?'],
    pull: ['I am the wind that broke the mountains flat. Come and be weighed against it.'],
    gale: ['Hold on to something, if you can find anything to hold.'],
    squall: ['The storm walks. Find its door or be torn through it.'],
    breath: ['Burn in the lightning\'s mouth.'],
    conduit: ['Feed my pylon, little ones, or I will.'],
    nova: ['Enough standing. Let us see how you fall.'],
    updraft: ['Back up, then. The sky is not finished with you.'],
    rings: ['Ring upon ring. Leap, or be swept away.'],
    spark: ['A spark for you. Carry it far from your friends.'],
    break: ['This ground offends me. I will have none of it.'],
    clouds: ['Rise and the clouds take you. Fall and the void does.'],
    kill: ['Gone on the wind, like all the rest.', 'Another leaf, torn from the branch.', 'Fly, then. You were never built for it.'],
    low: ['The sky does not bleed. The sky does not bleed.'],
    wipe: ['Lie still. The wind will scatter what is left.'],
    death: ['Even the storm must rest, at the last.'],
  },
  kaldurra: {
    intro: ['Come in out of the cold, children. I lit the first fire. Let me show you the last.'],
    pull: ['Every hearth you ever warmed your hands at was a spark of mine. I want them back.'],
    smash: ['The ground remembers my weight.'],
    wildfire: ['The fire walks. You will run out of island before it runs out of hunger.'],
    meteor: ['Catch, little one. It is still warm.'],
    flood: ['My blood is the sea now. Swim.'],
    rings: ['Dance in my rings. I always loved the dancing.'],
    seeds: ['Plant your little seeds. I will see what grows.'],
    roar: ['Now the world ends. Hide, if you have somewhere to hide.'],
    run: ['Down the length of you, all in one breath.'],
    crash: ['The ground came up to meet me.'],
    kill: ['Ash, and then nothing.', 'One less cold hand in the world.'],
    low: ['The hearth is going out. Not yet. Not yet.'],
    wipe: ['Sleep in the warm, children.'],
    death: ['Keep the fire for me. Someone must.'],
  },
  morvekh: {
    intro: ['I died here once. It was quiet. You have come to make it loud.'],
    pull: ['I remember every warm thing that ever froze. I will remember you.'],
    climb: ['Up, then. The cold is following you.'],
    breath: ['Breathe in. It is the last warm breath you take.'],
    grasp: ['The grave reaches up. Hold fast, or come down to me.'],
    bombs: ['Stand behind your friends. They are colder than you now.'],
    deep: ['I will draw a white line across the world.'],
    zero: ['When it reaches nothing, so will you.'],
    grip: ['My grip, my grip is gone.'],
    kill: ['Still now. Good.', 'You will keep. You will keep a very long time.', 'Another one for the ice.'],
    low: ['I remember dying. It was easier than this.'],
    wipe: ['Quiet again, as it should be.'],
    death: ['Warm. I had forgotten what warm was.'],
  },
  nihvaroth: {
    intro: ['You have come to the edge of everything. Look down. That is where your gods went.'],
    pull: ['I am the hunger under the stars. The other three were only my teeth.'],
    devour: ['Come closer. Closer. Everything comes to me in the end.'],
    float: ['One of you is lighter than the others. I will take that one first.'],
    spheres: ['Pieces of nothing. Hold them, if you dare.'],
    swallow: ['Into me, then. See what I have eaten.'],
    echoes: ['Meet my brothers again. They are mine now.'],
    cosmos: ['Your island is a crumb, and I am still hungry.'],
    stunned: ['What have you put in me. What have you done.'],
    nova: ['Your little stars. Watch them go out.'],
    ring: ['The edge comes in. It always comes in.'],
    kill: ['Taken, and gone.', 'Nothing ever comes back from me.', 'Another light, swallowed.'],
    low: ['I have never been empty before.'],
    wipe: ['Hush now. There is no sound where you are going.'],
    death: ['So this is what it is, to be filled.'],
  },
};
// Each god's lines as warnings of their own (`<god>_say_<when>_<n>`), the god's name before the words: one call shows them.
export const SAY_NAME = { thyrraxis: 'THYRRAXIS', kaldurra: 'KALDURRA', morvekh: 'MORVEKH', nihvaroth: 'NIHVAROTH' };
for (const [god, all] of Object.entries(LINES)) for (const [when, list] of Object.entries(all)) list.forEach((text, n) => { warnings[`${god}_say_${when}_${n}`] = `${SAY_NAME[god]}: ${text}`; });

export const ELDER = {
  key: 'elder', tag: 'ed', name: 'The Elder Dragon Gods', short: 'the Elder Gods', x: 6400, z: 6500, y: -300, level: 100, style: 'void',
  rooms, tunnels, pillars, daises, props, packs, bosses, warnings, leaps: LEAPS,
  turnWarn: { thyrraxis: 'thy_turn', kaldurra: 'kal_turn', morvekh: 'mor_turn', nihvaroth: 'nih_turn' },
  entry: { x: 0, z: 6, yaw: Math.PI }, exitIn: { x: 0, z: 11.6 }, exitOut: { x: MAW.x, z: MAW.z + MAW.r - 5, yaw: Math.PI },
  // In the caldera of the Sorrowhorn, under the Crown of Teeth, on the lake's south shore, facing the lake.
  portal: { x: -2577, z: -2913, yaw: Math.PI, r: 2.2 },
  post: { body: 'bard_m3', name: 'Warden Halric Stour', say: 'The Company sends nobody through that door under a hundred winters of steel. Four at your back, or go home. Nobody has come back with all four.' },
  last: 'nihvaroth', tough: { hp: 26, damage: 2.4 }, pay: { xp: 140000, gold: 9000 },
  names: { Dragonlings: 'VOIDWHELP', Dragons: 'ELDER DRAKE' },
  look: { wall: 'void:rubble', floor: 'void:stone', roof: 'void:rubble', deck: 'void:block', keel: 'void:rubble', kerb: 'void:block', flame: 'spore:flame', lamp: 'post', light: [0.72, 0.5, 1], fire: [0.8, 0.55, 1], every: 11, high: 2.2, glow: 1.6, lit: true, still: true },
  words: { enter: 'The Elder Dragon Gods. Islands broken off the world, hanging over the Maw. Four gods sleep on four of them.', clear: 'The Elder Dragon Gods are dead. Nihvaroth is swallowed by its own Maw.', wipe: 'Your party falls into the void... and the Rift throws you back onto the Threshold.' },
};
