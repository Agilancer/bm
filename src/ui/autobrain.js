// Auto-play's head (src/ui/autoplay.js has its button, its line on the HUD and its menu). It plays the game the way a player
// does, from the render thread: it reads the snapshot, the pack, the quests and the town, and works the same controls the keys
// and the mouse do (Input.auto: the feet, the run, the cast held; Input.yaw and pitch: the look; the press counters: staff,
// cast, jump, dodge; GameView.takeNearest: E). Nothing is moved or given by hand.
//
// What it does, most pressing first:
//   the opening   waits out the cave, answers to a name, walks out, and follows Lisandra down the Long Road to Bellmourn
//   a fight       anything that means it harm, or what it's hunting: the staff and all twelve spells on its bar, each for what
//                 it's good at, and only down a clean line (never through a wall or round a corner: it steps out for the
//                 shot); it backs off and keeps its distance, takes a blow on its shield when it has breath to, and now and
//                 then rides the shield away from them or across them, shooting as it goes
//   its spells    every level's point spent in the six trees by its build (BUILD), and its bar set from what it knows
//   running       from what it can't yet beat (the knights of Velscour, the Gravehart, the Hydra, a dragon), and home when it's low
//   loot          gold, orbs and stuff underfoot, gear with E, chests it passes; the best gear on, gems in their sockets
//   the town      every quest taken, steps talked through and handed in; sells what it won't wear, buys a mending, sleeps at the
//                 Tolling Bell when there's something to wait a night for
//   the quests    in an order that suits its level: errands, the woods, the catacombs (past the black knight's post, in at the
//                 Sexton's door), the countries out past the town by the roads and the seals, the night's work by night
//   grinding      for levels, and once every quest is done, where the menu says
//
// Where it walks: in the town, the woods round it and the catacombs, by paths from src/sim/nav.worker.js. Anywhere further than
// a few strides, out of the town (the woods too), by the roads as a person goes (planWay: src/core/roads.js has every road,
// lane and path in the land): to the nearest point of one, down them, and off where they come nearest; the pines stepped
// round by the same worker, and the woken seals when they're shorter. A delve's portal by the steps up its terrace.
// On the nav ground it never walks at where it's going without a path: it waits for one, and with no way there it leaves it.
// Through a door it goes square on, by a place a pace before its middle and one a pace beyond; and it never talks to anyone,
// opens a chest or takes anything up with a wall between (within()).
import * as LAYOUT from '../core/layout.js';
import { C, C_HERO, C_SIZE, CHARS_START, H, INPUT, MAX_SLIMES, MAX_TUMBLERS, SLIME_FLOATS, SLIMES_START, TUMBLER_FLOATS, TUMBLERS_START } from '../core/layout.js';
import { CAVE_MOUTH, CAVE_OUT, HERD_CONTROL, OPENING, RUN_OUT, WAY, WAY_FOOT } from '../core/opening.js';
import { CUE_IDS } from '../core/opening-script.js';
import { ROUTE, cornerAhead, routeAt, routeDir, routeNear } from '../core/escort.js';
import { terrainHeight } from '../core/terrain.js';
import { SITES } from '../core/lands.js';
import { roadGraph } from '../core/roads.js';
import { SEALS, portalStair } from '../core/sites.js';
import { inTown, townDist } from '../core/town.js';
import { CHURCH_GUARD, churchAt, inChurch } from '../core/church.js';
import { floorAt } from '../core/interior.js';
import { GROUP_KEYS, GROUPS, LAIRS, TRIPO_KIND } from '../core/tripo-monsters.js';
import { WILD_CALLS } from '../core/wilds.js';
import { CAMPS } from '../sim/slimes.js';
import { REACH, SPELLS } from '../sim/spells.js';
import { AMBUSH_AT } from '../sim/opening.js';
import { NODES, UTILITY, blocked, pointsAt, spent, startFree, startRanks } from '../sim/skills.js';
import { RULES, gatherSpots, isNight, outpostOf, placeSpot } from '../folk/quests.js';
import { LAND_LEVELS } from '../folk/land-quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { CROWD, PEOPLE, POSTED } from '../folk/people.js';
import { PHOBOS } from '../core/phobos-data.js';
import { BEYOND } from '../folk/lines/beyond.js';
import { LISANDRA } from '../folk/lines/lisandra.js';
import { TUMBLER_SIZES } from '../sim/tumblers.js';
import { TRADES, offerFor, worth } from '../folk/shops.js';
import { GEMS, GEM_GRADES, ROBES, gearTotals, matName } from '../items/items.js';
import { BOSSES, DELVES, delveAt, delveByKey, delveOf, inDungeon, toWorld as caveWorld } from '../core/dungeon.js';
import { caveStep, delveWay, doHire, doWarrens, hireJob, hiring, perilsNear, tactics, warrensCoverage, warrensJob } from './autowarrens.js';
import { HallNav, STATIONS, hallAt, inArena, inHall } from '../core/testhall.js';
import { thirdLead } from './autocam.js';
import { LET_OUT, ONE_MORE, PACK_MAKER } from './folk.js';
import { MAX_EXTRA, slotPrice } from '../items/pack.js';
import { CHANNEL } from '../items/beacon.js';
import { PHOBOS_LEVELS } from '../folk/phobos-quests.js';
import { DOOR_STEP, FIRST_VISIT, FIRST_VISIT_LEVELS, SILL_DOOR } from '../folk/first-visit.js';
import { EAST_DOOR, inEast } from '../sim/east-nav.js';

// The beacon stone (src/ui/beacon.js): used when the work's in Bellmourn and further off than BEACON_FAR, with nothing
// within BEACON_CLEAR to break it off; while it's at work, it stands still for it unless something's within BEACON_HOLD.
const BEACON_FAR = 300, BEACON_CLEAR = 20, BEACON_HOLD = 14;

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
// A quest place's name, to say where it's off to: a site's, or a district of Phobos's ('ph:<district>'), or its key.
const placeName = (k) => SITES[k]?.name || (k?.startsWith?.('ph:') && PHOBOS.districts.find((d) => d.key === k.slice(3))?.name) || (k?.startsWith?.('outpost:') && outpostOf(k.slice(8))?.name) || k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// The point `far` metres on along a path from (x, z): where a walker's eyes are while their feet are on the next step.
function ahead(x, z, pts, far) {
  let px = x, pz = z, left = far;
  for (const [qx, qz] of pts) {
    const L = dist(px, pz, qx, qz);
    if (L >= left) return [px + (qx - px) * left / L, pz + (qz - pz) * left / L];
    left -= L; px = qx; pz = qz;
  }
  return [px, pz];
}
const SP = Object.fromEntries(SPELLS.map((s, i) => [s.key, i]));
// A hired hero's part in the party, as the snapshot has it (src/sim/hero.js writeHero).
const ROLE = ['', 'tank', 'heal', 'dps'];
const NAME = 'Jamie';   // what it answers Lisandra with, if nobody has yet
const MAX_SIGHT = 26;   // how far off it'll take on what it's hunting
// Bold (the Auto menu's temperament, src/ui/autoplay.js): it takes on what it would have left two levels more, is beaten back
// one level instead of two, and stays in a fight it's hurt in while there's a kill to finish.
const BOLD_LEVELS = 2;
// In the town it opens a chest only when it's passing one (it used to go round every house for them before it took a quest).
const TOWN_CHEST = 9, TOWN_CHEST_GAP = 90;
// How long a line is left up to be read before it's answered (Settings' Talk in auto-play): by its length, as a reader takes it.
// (A brisk reader's: slower, and a quest-giver with a lot to say held him the best part of a minute.)
export const readTime = (line) => clamp(0.6 + String(line || '').replace(/<[^>]*>/g, '').length / 34, 1.2, 5);

// ---------------------------------------------------------------- the world as it judges it

// Posts it keeps clear of until it's strong enough: [x, z, how wide, from what level]. (Velscour's man on the west road and the
// black knight on the cathedral's steps keep a post and a leash: src/core/knights.js, src/sim/sim.worker.js BLACK.)
const CATHEDRAL_GUARD = { x: CHURCH_GUARD[0], z: CHURCH_GUARD[1] };
// The black knight: his post, his leash (BLACK.leash in src/sim/sim.worker.js), where it stands to work on him, and the level it
// goes for him at (raised two each time he sends it back to the town).
const BLACK_POST = CHURCH_GUARD, BLACK_LEASH = 20, SIEGE_RING = 29, BOSS_LEVEL = 11;   // (11 since the six trees: the level its build has a Thunderbolt at)
// The Mourning Rift, where the Hydra lives: the one way to it is the passage north out of the Founders' Hall, and the bridge
// over it has a gap in it. Kept out of for good, as a circle on the passage and the bridge: nothing past the hall's north
// wall. (It used to be 46 m round the Hydra itself, straight through the rock: the Hydra is twenty metres under the halls
// and can't come up, and that circle shut the way to the Abbots' Gallery and the Tomb and took in most of the Founders'
// Hall, so it never went below the Reliquary.)
const RIFT_AT = churchAt(186, -128), RIFT_R = 23, RIFT_Z = churchAt(0, -104)[1];
const POSTS = [
  [-78, -3, 30, 18], [CATHEDRAL_GUARD.x, CATHEDRAL_GUARD.z, 28, 99], [-40, -150, 44, 14], [150, 110, 26, 8],
  [-72, -78, 22, 4], [118, -64, 22, 4], [RIFT_AT[0], RIFT_AT[1], RIFT_R, 99],
];
// How long the catacombs are left once a round of them finds nobody (src/sim/undead.js RISE_AGAIN: their dead are up
// again once it's been out of them four minutes).
const DRY_LOOK = 40, DRY_FOR = 300, HUNT_DRY_FOR = 600;   // (seconds. The first: how long a round of looking has to have gone on. The last: any other quest's hunt that finds its grounds empty)
// The lairs out in the land (src/core/tripo-monsters.js), by the level it wants before it goes near one.
// What it says of each thing the living land calls it to (WILD_CALLS in src/core/wilds.js; src/ui/wilds.js calls), and
// how many levels under the thing's own it'll still go: a raid has the other Tessariels in it, a tear nobody but itself.
const WILD_SAY = {
  raid: (c) => `${c.name} is raided: holding it with whoever's come.`,
  tear: (c) => (c.fight ? `Fighting what comes through ${c.name.toLowerCase()}.` : `${c.name.charAt(0)}${c.name.slice(1).toLowerCase()} is open near here: walking into it.`),
  find: (c) => `Something's been left over there (${c.name.toLowerCase()}): a look.`,
  bounty: (c) => `The bounty: to ${c.name.replace(/^an? /, 'the ')}, for its chief.`,
};
const WILD_UNDER = { raid: 3, tear: 1, find: 99, bounty: 0 };
// (The land's outposts and standing battles carry their own, from their faction's: src/core/wilds.js.)
const lairLevel = (l) => l.lvl ?? LAIR_LEVEL[l.key];
// How near a lair it can go by without being seen: as far as one of them wanders from it (src/sim/tripo.js roam), and their
// sight (24 m, a stalker's 34, a dragon's 48), and ten metres more.
const lairPass = (l) => l.r * 0.6 + 2 + ((l.wake || 110) >= 200 || (l.boss || []).some((b) => /dragon|wyrm/.test(b)) ? 48 : 34) + 10;
const LAIR_LEVEL = {
  werewolf: 6, nest: 4, goblin_camp: 2, kobold_den: 2, lost_children: 1, goat_ring: 6, mill_dolls: 5, falls_drake: 8, sallow_drowned: 9,
  fen_worm: 16, fen_harpies: 8, fen_dragon: 24, cutter_raiders: 6, fungal_brood: 7, abbey_road_goats: 7, vigil_guard: 16, obelisk_guard: 16,
  bone_field: 18, ash_dragon: 24, ash_worm: 16, crown_dragon: 24, stair_demons: 12, hollow_dolls: 8, barrow_lords: 10, barrow_wyrm: 20,
  maiden_coven: 9, fell_harpies: 9, gallows_plague: 14, grawl_bats: 10, grove_demons: 12,
  // (The roadsides, the small towns' troubles and the far countries: each by what stands there.)
  dark_goblins_nw: 5, dark_spiders_ne: 4, dark_goats_e: 6, dark_children_s: 4, dark_wolf_w: 7, hill_kobolds: 3, hill_goblins: 4, frost_kobolds: 3,
  frost_spiders: 5, frost_wolf: 8, fenway_goblins: 3, fenway_spiders: 5, vigil_kobolds: 3, vigil_goats: 6, vigil_children: 7, track_children: 5,
  cairn_keepers: 6, downs_raiders: 5, abbey_rd_goblins: 5, gallows_rd_goblins: 4, cliff_harpies: 7, downs_goats: 7, thorn_goats: 8, thorn_ram: 10,
  thorn_stragglers: 9, fenway_children: 6, fenway_drowned: 8, mile_drowned: 9, fen_east_harpies: 10, fen_children: 9, abbey_rd_raiders: 8,
  quarry_kobolds: 9, rust_bat: 11, abbey_webs: 11, rust_spiders: 13, rust_kobolds: 10, rust_warband: 12, pilgrim_dolls: 6, pilgrim_spiders: 7,
  deep_spiders: 9, deep_worm: 14, horn_whelps: 12, horn_demons: 14, cinder_refugees: 9, cinder_scouts: 11, charmill_possessed: 12, khel_ghouls: 12,
  vigil_patrol_1: 13, vigil_patrol_2: 14, vigil_patrol_3: 15, keep_necros: 16, waste_lancers: 15, waste_plague: 13, waste_golem: 16, waste_necros: 15,
  track_possessed: 7, wayhouse_dead: 9, moor_golem: 12, moor_whelps: 13, moor_knight: 14, rime_goats: 10, fells_goats: 11, fells_wolves: 12,
  mouth_demons: 13, tor_roost: 13, tor_demons: 14, toll_ambush: 11, gallows_bat: 10, gallows_demons: 13, gibbet_possessed: 12, gallows_giant: 14,
};
// (For the quests' own rules, tools/quests/rules.mjs: the level it wants for a lair, by its key.)
export const lairLevelOf = (key) => { const l = LAIRS.find((q) => q.key === key); return l ? lairLevel(l) ?? null : null; };
// What it'll stand and fight, by kind (FOE_NAMES in src/main.js) and its level. A kind added since it was taught (KNOWN_KINDS), it
// judges by its life against its own level; coverage() below names it, so it can be taught properly.
const KNOWN_KINDS = new Set([0, 1, 2, 3, 4, 5, 6, 9, 10]);
// The lairs made low for a new player, the Sill's under Phobos (xpScale, src/core/tripo-monsters.js): what's in one is of that
// lair's level, not its kind's, and it's fought at that level (inLowLair). The Redoubt's two gate-wards, his knights at level
// four, were run from at five, as a knight of his is anywhere else till fifteen. The critics, docs/FIRST-VISIT.md.
const LOW_LAIRS = LAIRS.filter((l) => l.xpScale && l.lvl);
const inLowLair = (f, lvl) => f.kind >= TRIPO_KIND && LOW_LAIRS.some((l) => l.lvl <= lvl && Math.hypot(f.x - l.x, f.z - l.z) < l.r + 40);
function fightableAt(kind, lvl, maxHp = 0, slime = false) {
  if (slime || kind === 5) return true;                // the jellies (their own list), the risen
  if (kind === 9) return lvl >= 6;                     // the werewolf
  if (kind === 2) return lvl >= 2;                     // the falls' crabs
  if (kind === 6) return lvl >= 4;                     // an ogre
  if (kind === 10) return lvl >= 8;                    // the Abyssal Mouth
  if (kind === 3) return lvl >= 14;                    // the Gravehart
  if (kind === 0) return lvl >= 18;                    // a knight of Velscour
  if (kind >= TRIPO_KIND) {
    const hp = GROUPS[GROUP_KEYS[kind - TRIPO_KIND]]?.hp || maxHp || 999;
    return lvl >= (hp <= 60 ? 1 : hp <= 90 ? 3 : hp <= 170 ? 6 : hp <= 240 ? 10 : hp <= 520 ? 15 : 24);
  }
  if (!KNOWN_KINDS.has(kind)) return maxHp > 0 && maxHp <= 60 + lvl * 30;
  return false;                                        // the Hydra; Tessariel's knights; the other Tessariels
}

// The quests, in the order it takes them on, and the level it wants for each.
const PLAN = [
  ['lisandra_work', 1], ['bed_and_bell', 1], FIRST_VISIT_LEVELS[0], ['letter', 1], ['pines', 1], ['iron_from_dead', 2], ['dead_cant_wait', 3], ['shroud_and_thread', 3], ['bones_for_carver', 3],
  ['toll_of_bell', 5], ['barrow_lights', 8],
  ['crown_of_teeth', 11], ['black_road', 13],
  // The land's (src/folk/land-quests.js): out to the small towns, what besets them, and down the party dungeons.
  ['word_to_thornwick', 6], ['hare_and_harrow', 6], ['man_at_the_cross', 6],
  ['tracks_west', 7], ['ask_the_burner', 7], ['girl_from_khel', 7],
  ['hedge_breakers', 8], ['owed_to_frostwatch', 9], ['moor_wayhouse', 9], ['ossery_quarry', 9],
  ['up_from_the_gallowswood', 9], ['ash_on_the_wind', 9], ['black_ram', 10], ['old_toll', 11], ['red_scouts', 11], ['salt_for_the_hanged', 12],
  ['charcoal_for_khel', 12], ['charred_mill', 12], ['mouth_guard', 13], ['ravens_tor', 13], ['vigil_patrols', 14], ['arch_before_the_gate', 14],
  ['into_the_deeps', 14], ['the_howling', 14], ['gate_of_blackvigil', 14], ['broodmother', 15], ['red_cloth', 15], ['first_lord', 15], ['the_sleeper',
  16], ['lords_of_the_keep', 17], ['the_castellan', 18],  // The four delves made after those, each at its own level and a little over for its last boss.
  ['the_ring_below', 12], ['what_it_fruits_from', 13], ['the_winter_company', 14], ['last_night_of_the_run', 15],
  ['sung_open', 17], ['king_under_the_moor', 18],
  // The regions' (src/folk/regions/, docs/QUEST-LOOP.md).
  ...LAND_LEVELS,
  // The Elder Dragon Gods: a party of the hundredth winter.
  ['storm_over_the_horn', 100], ['the_hollow_star', 102],
  // City State Phobos's first (src/folk/phobos-quests.js): you come to it at about twenty.
  ...PHOBOS_LEVELS,
  // The first visit there, long before (src/folk/first-visit.js): through Lisandra's door (above, straight after Bram's
  // errand), home at five or six.
  ...FIRST_VISIT_LEVELS.slice(1),
];
// (Taken on in the order of the levels they want.)
PLAN.sort((a, b) => a[1] - b[1]);
const LEVEL_OF = Object.fromEntries(PLAN);
// A quest added since the plan was written goes on the end of it, at a level guessed from what it pays (coverage() names it).
const guessLevel = (id) => Math.max(1, Math.min(20, Math.round((RULES[id].xp || 200) / 110)));
const PLAN_ALL = PLAN.filter(([id]) => RULES[id]).concat(Object.keys(RULES).filter((id) => !(id in LEVEL_OF)).map((id) => [id, guessLevel(id)]));
// The level it wants for a quest: the quest log (src/ui/questlog.js) suggests the same to a player.
export const questLevel = (id) => LEVEL_OF[id] ?? guessLevel(id);
// How long a quest dropped from the quest log is left be before it goes back to its giver for it (ms, by the wall clock).
export const DROP_REST = 15 * 60 * 1000;

// Where each place in a quest's steps is, for walking to: a point, and how near counts.
const area = (k) => {
  if (k === 'catacombs' || k === 'bellcrypt') return { x: churchAt(186, 0)[0], z: 0, r: 6, below: true };
  if (k === 'woods') return { x: -45, z: 150, r: 40 };
  if (k === 'millhaven') { const c = CAMPS.find((q) => q.key === 'millpond'); return { x: c.x, z: c.z, r: 20 }; }
  if (k === 'fen') { const c = CAMPS.find((q) => q.key === 'sallow'); return { x: c.x, z: c.z, r: 30 }; }
  const s = SITES[k];
  if (s) return { x: s.x, z: s.z, r: s.r * (k === 'keep' ? 1.4 : 0.9) };
  // The Waste, where Velscour's knights ride: the first of their patrols on the Vigil Road.
  if (k === 'waste') return { x: -3200, z: -430, r: 40 };
  // A lair's glade, or a party dungeon's portal out in the land (src/folk/quests.js placeSpot). (Down a dungeon is the
  // delve's own work: warrensJob, by delveWants.)
  const p = placeSpot(k);
  return p ? { x: p.x, z: p.z, r: Math.max(6, p.near) } : null;
};
const DELVE_KEYS = DELVES.map((d) => d.key);
// Where to hunt for what a kill step wants.
const HUNTS = {
  woods: [[-45, 150], [20, -125], [-160, 60], [-62, 160], [100, -128], [-170, 70], [60, 120], [-110, 110], [170, 40], [-120, -60]],
  millhaven: CAMPS.filter((c) => c.key === 'millpond').map((c) => [c.x, c.z]),
  fen: CAMPS.filter((c) => ['sallow', 'fen1', 'fen2'].includes(c.key)).map((c) => [c.x, c.z]),
  barrows: CAMPS.filter((c) => c.key === 'barrows').map((c) => [c.x, c.z]),
  bellcrypt: [churchAt(186, 0), churchAt(190, 6), churchAt(182, -6)],
  // Velscour's knights on the Vigil Road and round it, east to west (src/core/tripo-monsters.js LAIRS).
  waste: ['vigil_patrol_1', 'vigil_patrol_2', 'vigil_patrol_3', 'vigil_guard', 'waste_lancers', 'obelisk_guard'].map((k) => LAIRS.find((l) => l.key === k)).filter(Boolean).map((l) => [l.x, l.z]),
};
// Where to hunt for a kill step: its own grounds; a lair's glade; nowhere for a dungeon's (it goes down it instead).
// (A room down a delve, 'room:<id>', is that delve's: roomDelve.)
const roomDelve = (k) => (typeof k === 'string' && k.startsWith('room:') ? DELVES.find((d) => d.rooms.some((r) => r.id === k.slice(5)))?.key ?? null : null);
const huntsFor = (k) => HUNTS[k] || ((k.startsWith('lair:') || k.startsWith('outpost:')) && area(k) ? [[area(k).x, area(k).z]] : DELVE_KEYS.includes(k) || roomDelve(k) ? [] : null);

// The menu's grinding grounds (src/ui/autoplay.js GRINDS).
export const GRINDS = {
  woods: { name: 'The woods round Bellmourn', line: 'The risen in packs, the graveyards, the chests among the pines.' },
  catacombs: { name: 'The catacombs', line: 'Room after room of the dead below the cathedral, and the best loot there is near town.' },
  lairs: { name: 'The monster lairs', line: 'Every lair it can take at its level, near and far, cleared as they fill again.' },
  jellies: { name: 'The jelly camps', line: 'Out to the millpond and the Weeping Fen: easy work, a long way from home.' },
  roam: { name: 'Roam the land', line: 'Every country and every seal, chests and fights wherever the road goes.' },
};

// What it can be set to (the menu under the Auto button, src/ui/autoplay.js): the quests, grinding where GRINDS says, runs
// through every dungeon the player has finished, one after another, round and round until it's stopped (begun down one, that
// one first), or a plain fight: from monster to monster round where it was begun (fightJob).
export const MODES = {
  quests: { name: 'Complete Quests', line: 'Every quest the town has, in an order that suits its level: taken, worked through and handed in.' },
  grind: { name: 'Grind monsters for XP', line: 'No quests: only levels, wherever you send it.' },
  dungeons: { name: 'Dungeon Runs', line: 'Through every dungeon whose portal you have found, easiest first, one after another and round again, until you stop it.' },
  fight: { name: 'Auto Fight', line: 'Right here: runs at the nearest monster, then the next, and waits about for more when none are near. No quests, no town.' },
};

// Auto Fight (fightJob): how far off the next monster may be before it waits instead, and how far from where it was begun
// it'll go after one (so a string of them doesn't lead it off across the land).
export const FIGHT_SEEK = 45;
export const FIGHT_AREA = 70;

// The dungeons it runs: the party dungeons, each behind a portal out in the land (src/core/dungeon.js DELVES), easiest first,
// and only those whose portal the player has found: seen on the map (its fog cleared there, src/ui/map.js isSeen), or been
// through already (src/ui/party.js clears, kept in the save). The catacombs and the Bell Crypt aren't among them: they're
// under the cathedral, with no portal, and a run of them was a wander round spots it often couldn't reach. A run is the
// way through to the delve's last boss and out by its far portal; then the next, and after the last, the first again.
export const DUNGEONS = DELVES.map((d, i) => ({ key: d.key, name: d.name, delve: true, i, level: d.level, portal: d.portal }))
  .sort((a, b) => a.level - b.level || a.i - b.i);
const portalFound = (game, d) => {
  if ((game.party?.clearsBy?.[d.key] || 0) > 0) return true;
  const M = game.worldMap, p = d.portal;
  return !!M?.isSeen && [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]].some(([dx, dz]) => M.isSeen(p.x + dx, p.z + dz));
};
// (here: the key of the delve the player's down now, which counts whether its portal's been found or not: come in by the
// skull's Teleport to Dungeon, it may not have been. Dungeon Runs begun down one go through that one first: dungeonJob.)
export const finishedDungeons = (townUI, game, here = null) => DUNGEONS.filter((d) => d.key === here || portalFound(game, d));
const lower = (s) => s[0].toLowerCase() + s.slice(1);

const SLOT_OF = (it) => (it.type === 'weapon' ? 'main' : it.type === 'shield' ? 'off' : it.type === 'skull' ? 'skull' : it.type === 'robe' ? ROBES[it.base]?.slot : null);
// What a set of gear is worth to a wizard: spell power first.
const WORTH = { power: 260, thrift: 180, regen: 45, mana: 0.7, life: 0.9, armor: 1.2, leech: 5 };
function gearScore(slots) {
  const t = gearTotals(slots);
  let s = 0;
  for (const k in WORTH) s += (t[k] || 0) * WORTH[k];
  const w = slots.main;
  if (w?.dmg) s += (w.dmg[0] + w.dmg[1]) * 0.25;
  if (slots.off?.power && !slots.skull) s += 5;
  return s;
}

// What each spell's for, as a score for the fight as it stands: 0 when it's no use. c: d to its mark, dn to the nearest, n
// of them in the fight, close within 5.5 m, near within 9 (a Nova's reach), around its mark, hpf, fast, still, big, inLine, coming, and how the fight
// stands: fresh (just begun, the first throw), frozen (a Nova's ice still on them), pulled (a Gravity Well drawing them
// in), held (its tank has the mark, so it stands still with the rest about it), party; T is the mark itself, and b the brain.
// SELF: cast on itself, no aim. GROUND: aimed at the feet. BOLTS: what a raised shield stops. A spell added to the game is
// taught here too. (Bellmourn's twenty first, then the forty the six trees added: src/sim/skills.js.)
const risen = (c) => !!c.T && (c.T.kind === 5 || c.T.kind === 6);
// IN: how near its mark has to be for what it throws to get there. Nothing it casts goes past REACH (src/sim/spells.js),
// measured from its eyes, and a mark's distance here is to its middle along the ground: a little inside that, to be sure.
const IN = REACH - 0.5;
const USE = {
  firebolt: (c) => c.d < IN && (c.d > 6 ? 3.4 : 2.6) + (c.fresh ? 1.4 : 0),
  frost: (c) => c.d < IN && 2.2 + (c.fast ? 2.2 : 0),
  lightning: (c) => c.d > 4 && c.d < IN && (c.around >= 2 ? 4.2 : 1.6),
  missiles: (c) => c.d < IN && 2.6 + (c.fast ? 0.8 : 0),
  arcaneblast: (c) => c.d < 8.5 && (c.close >= 2 ? 5.6 : c.dn < 6 ? 4.4 : 2.6) + (c.frozen ? 1.5 : 0),
  firebeam: (c) => c.d < IN && (c.around >= 2 ? 3.6 : 2.7),
  chain: (c) => c.d < IN && (c.around >= 2 ? 4.6 : c.n >= 2 ? 3.2 : 2.2),
  nova: (c) => (c.close >= 3 ? 8 : c.close >= 2 ? (c.hpf < 0.6 ? 7.6 : 5.2) : c.near >= 3 ? 6 : c.near >= 2 && c.big ? 4.2 : 0),
  meteor: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 6.2 : c.around >= 2 && (c.held || c.frozen || c.pulled) ? 5.6 : (c.still || c.held || c.frozen) && c.big ? 4.8 : 0),
  blizzard: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 5.2 : c.around >= 2 && (c.held || c.pulled) ? 4.6 : (c.still || c.held) && c.big ? 3.2 : 0),
  drain: (c) => c.d < IN && c.hpf < 0.8 && 3.5 + (1 - c.hpf) * 4,
  lance: (c) => c.d < IN && (c.inLine >= 2 ? 5 : 2.6),
  well: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 5.6 : c.n >= 3 && !c.pulled ? 4.2 : 0),
  plague: (c) => c.d > 4 && c.d < IN && (c.around >= 2 ? 4 : c.held && c.big ? 3.2 : 1.5),
  blades: (c) => !c.bladesUp && (c.close >= 2 ? 5 : c.n >= 3 && c.dn < 12 ? 3.8 : 0),
  spikes: (c) => c.d < IN && (c.inLine >= 2 ? 4.6 : 2.4) + (c.frozen ? 1 : 0),
  wallfire: (c) => c.d > 3 && c.d < IN && c.coming && (c.around >= 2 ? 4.2 : c.n >= 2 ? 3 : 0),
  // (A healer at its back mends it too: its own Mend waits a little longer then.)
  mend: (c) => c.hpf < (c.healer ? 0.3 : 0.4) && c.dn > 6 && 9,
  wisp: () => 0,
  // (Blink is a way out, not a blow: cast from the kite, facing away. See combat().)
  blink: () => 0,
  // ---- Fire
  comet: (c) => c.d > 3 && c.d < IN && (c.around >= 2 ? 4.2 : 2.4),
  firenova: (c) => (c.close >= 2 ? 6 : c.near >= 3 ? 4.4 : 0),
  wyrm: (c) => c.d < IN && 2.8 + (c.fast ? 1.5 : 0),
  phoenix: (c) => c.d < IN && (c.inLine >= 2 ? 5.2 : c.hpf < 0.6 ? 3.6 : 2.2),
  bomb: (c) => c.d < IN && (c.big ? 4.6 : c.around >= 2 ? 3.6 : 2),
  inferno: (c) => c.close >= 3 && 7.2,
  // ---- Ice
  coldcone: (c) => c.d < 7.5 && (c.close >= 2 ? 5.2 : 2.6),
  rime: (c) => c.d < IN && 2.9 + (c.fast ? 1.5 : 0),
  frostray: (c) => c.d < IN && (c.fast || c.big ? 3.6 : 2.4),
  prism: (c) => c.d < IN && (c.inLine >= 2 ? 4.8 : 2.2),
  orb: (c) => c.d > 3 && c.d < IN && (c.around >= 3 ? 5 : c.around >= 2 && (c.held || c.pulled) ? 4.2 : 0),
  // (Worth it only on what a Nova has frozen, or its own cold has just slowed: ICED below.)
  shatter: (c, b) => (c.frozen || b.t - (b.iceT ?? -99) < 4) && c.dn < IN && 6.5,
  zero: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 6.2 : (c.still || c.held) && c.big ? 4 : 0),
  // ---- Earth
  stone: (c) => c.d < IN && 2.5 + (c.dn < 6 ? 0.8 : 0),
  thorns: (c) => c.d < IN && (c.around >= 2 ? 3.4 : 2.2),
  boulder: (c) => c.d > 3 && c.d < IN && (c.around >= 2 ? 4.4 : 2.2),
  stoneskin: (c) => (c.close >= 2 || c.hpf < 0.6) && c.dn < 9 && 7,
  vine: (c) => c.d > 3 && c.d < IN && (c.around >= 3 ? 5.4 : c.n >= 3 && c.coming ? 4 : 0),
  quake: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 6 : (c.still || c.held || c.frozen) && c.big ? 3.6 : 0),
  monolith: (c) => c.d < IN && (c.big ? 5.6 : 2.6),
  // ---- Arcane
  rune: (c) => c.coming && c.d > 4 && c.d < IN && 3.4,
  crescent: (c) => c.d < IN && (c.inLine >= 2 ? 4.4 : 2.5),
  stasis: (c) => c.d > 3 && c.d < IN && (c.around >= 3 ? 5.2 : c.big ? 3.4 : 0),
  disintegrate: (c) => c.d < IN && (c.inLine >= 2 ? 5 : c.big ? 4.2 : 2.4),
  starfall: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 6 : c.around >= 2 && (c.held || c.frozen || c.pulled) ? 5.4 : (c.still || c.held || c.frozen) && c.big ? 4.2 : 0),
  // ---- Lightning
  spark: (c) => c.d < IN && 2.7 + (c.fast ? 1.2 : 0),
  fork: (c) => c.d < IN && (c.around >= 2 ? 4.2 : 2.2),
  // (A seed only pays if there's lightning on the bar to send on from it.)
  seed: (c, b) => c.d < IN && c.around >= 2 && b.stormOnBar && 3.6,
  thunderclap: (c) => (c.close >= 3 ? 7.6 : c.close >= 2 && c.hpf < 0.6 ? 7.5 : 0),
  // (Both step it through the fight, and it fights from a distance. Blink it keeps as a way out; Stormstep it never slots.)
  stormstep: () => 0,
  // (Out of the sky, where a raised shield can't turn it.)
  thunder: (c) => c.d > 3 && c.d < IN && (c.big ? 5 : 3),
  staticfield: (c) => c.close >= 2 && 5.4,
  tempest: (c) => c.d > 4 && c.d < IN && (c.around >= 3 ? 6.2 : (c.still || c.held) && c.big ? 4.4 : 0),
  // ---- Utility
  fleet: (c) => c.hpf < 0.5 && c.dn < 8 && 5,
  turn: (c) => (risen(c) ? (c.close >= 2 ? 7.8 : c.near >= 3 ? 5 : 0) : c.close >= 3 && 4),
  renew: (c) => c.hpf < (c.healer ? 0.5 : 0.7) && 5.6,
  aegis: (c) => c.hpf < 0.75 && c.dn < 10 && 6.4,
  sanctuary: (c) => c.hpf < 0.6 && c.close >= 2 && 6.6,
  empower: (c) => c.big && c.d < 40 && 4.4,
  stillness: (c) => c.hpf < 0.35 && c.close >= 3 && 8.5,
};
const SELF = new Set(['nova', 'mend', 'blades', 'wisp', 'firenova', 'inferno', 'shatter', 'stoneskin', 'thunderclap', 'staticfield', 'renew', 'fleet', 'turn', 'aegis', 'sanctuary', 'empower', 'stillness']);
const GROUND = new Set(['meteor', 'blizzard', 'wallfire', 'zero', 'quake', 'monolith', 'rune', 'starfall', 'thunder', 'tempest']);
const BOLTS = new Set(['firebolt', 'frost', 'lightning', 'missiles', 'lance', 'chain', 'firebeam', 'spikes', 'arcaneblast', 'comet', 'wyrm', 'phoenix', 'bomb', 'coldcone', 'rime',
  'frostray', 'prism', 'stone', 'thorns', 'boulder', 'vine', 'crescent', 'stasis', 'disintegrate', 'spark', 'fork', 'seed']);
// Always on its bar, once it knows them: Firebolt and Mend, and the first it has of each of these two lists. PANIC: what it
// casts at once with three of them on it. SKY: what comes down on a raised shield from where the board can't turn it.
const PANIC = ['nova', 'thunderclap', 'turn'], SKY = ['meteor', 'thunder'];
const CORE = ['firebolt', 'mend'], CORE_ALL = [...CORE, ...PANIC, ...SKY];
const coreOf = (known) => [...CORE, PANIC.find(known), SKY.find(known)].filter(Boolean);
// What the slots of 1 to 9 past those are for, so the nine between them cover a fight: for a crowd or a line of them, and to
// pour on a single mark or to get it out of trouble, one of each in turn. Each list's spells take their turn on it (bar()).
const SLOT_A = ['chain', 'well', 'lightning', 'blizzard', 'lance', 'plague', 'wallfire', 'spikes',
  'comet', 'firenova', 'phoenix', 'inferno', 'coldcone', 'prism', 'orb', 'shatter', 'zero', 'thorns', 'boulder', 'vine', 'quake', 'rune', 'crescent', 'stasis', 'starfall',
  'disintegrate', 'fork', 'seed', 'thunderclap', 'staticfield', 'tempest'];
const SLOT_B = ['arcaneblast', 'frost', 'missiles', 'firebeam', 'blades', 'blink',
  'wyrm', 'bomb', 'rime', 'frostray', 'stone', 'stoneskin', 'monolith', 'spark', 'thunder'];
// The Utility school's (UTILITY: src/sim/skills.js), which alone go in the bar's last three slots, on 0, - and +: Mend (in
// CORE) and Turn the Dead first, when it knows them, then these in their turn, so in time each has been in its hands.
const UTIL_TURN = ['turn', 'renew', 'aegis', 'sanctuary', 'stillness', 'empower', 'fleet', 'drain'];
// What's never on its bar: cast when it's wanted, by the book (a light underfoot down among the dead), or never.
const OFF_BAR = new Set(['wisp', 'stormstep']);
// Its own cold, after which a Shatter pays; the big slow casts it waits a moment after; its lightning.
const ICED = new Set(['nova', 'coldcone', 'blizzard', 'zero', 'frostray', 'rime', 'orb']);
const HEAVY = new Set(['meteor', 'blizzard', 'well', 'zero', 'quake', 'starfall', 'tempest', 'monolith', 'thunder']);
const STORM = ['spark', 'chain', 'fork', 'lightning', 'thunder'];

// The six trees (src/sim/skills.js): what it puts its points in, in this order, each as soon as it can be bought (a level, a
// spell it grows from, points already in the school). It's a build that gives its head what it leans on, when it needs it:
// a Mend first; Lightning to a Thunderclap by level 6, for when they're on it; Turn the Dead for the packs; a Thunderbolt at
// 11, which is what it takes to the black knight's shield (BOSS_LEVEL); then Fire, to a Meteor at 18; then masteries, more
// ranks, and Ice to a Frost Nova. Past the end of the list, a point goes into whatever known spell has the fewest ranks.
const BUILD = [
  'mend', 'chain', 'spark', 'spark', 'turn', 'thunderclap', 'spark', 'chain', 'firebeam', 'firebolt', 'firebolt', 'thunder',
  'wallfire', 'comet', 'firenova', 'bomb', 'firebolt:searing', 'firebolt', 'wallfire', 'meteor', 'mend', 'renew', 'thunder', '@lightning', '@fire', '@fire',
  'meteor', 'meteor:crater', 'coldcone', 'frost', 'frost', 'nova', '@fire', '@fire', '@fire', 'aegis', 'thunder', 'thunder:twice', 'fork', 'meteor', 'meteor',
  '@lightning', '@lightning', 'stone', 'lance', 'frost', 'nova', 'blizzard',
];
// Whether the build can be bought as written: it's played through from level 1 to 50, and what's still unbought at the end
// (a spell that's gone, a branch whose other was taken, a tier it never has the points for) is named.
export function buildGaps(build = BUILD, name = 'its build') {
  const out = [], ranks = startRanks(), free = startFree();
  for (const id of build) if (!NODES[id]) out.push(`${name} wants "${id}", which isn't a node in the six trees`);
  const want = build.filter((id) => NODES[id]);
  let at = 0;
  for (let lvl = 1; lvl <= 50; lvl++) {
    while (at < want.length && pointsAt(lvl) - spent(ranks, free) > 0 && !blocked(ranks, free, lvl, want[at])) { ranks[want[at]] = (ranks[want[at]] || 0) + 1; at++; }
  }
  if (at < want.length) out.push(`${name} stops at "${want[at]}" (${blocked(ranks, free, 50, want[at]) || 'out of points'}), with ${want.length - at} left unbought`);
  return out;
}

// ---------------------------------------------------------------- Full Auto

// Settings, Auto combat style (src/ui/settings-spec.js autoStyle). Cinematic is all of the above: a build that gives it a
// little of everything, a bar that turns every spell it knows through its hands, and its biggest kept for the moment worth
// watching. Full Auto fights to win: the build below, the bar of what pays (FULL_PICK), and the rotation of fullShoot().
//
// The build: Fire for its burst (Firebolt to rank 5 and Searing Core, so a full gather is quick; Cinder Brand, leaping;
// Meteor with its shower), Mend to stay standing, and Lightning as far as a Thunderclap for when they're on it and a
// Thunderbolt by level 11, out of the sky, for the black knight's raised shield (BOSS_LEVEL), then the masteries.
// Fire's damage per mana is the best of the six (a gathered Firebolt is 95 for 10), and its cooldowns fall in a ladder
// (Brand 4 s, Thunderbolt 5, Ring 10, Meteor 10) that has something ready nearly every second cast.
export const FULL_BUILD = [
  'firebolt', 'mend', 'comet', 'fork', 'spark', 'spark', 'thunderclap', 'spark', 'spark', 'firebolt', 'firebolt:searing', 'thunder',
  'firenova', 'firebolt', 'firebolt', 'firebolt:searing', 'firebolt:searing', 'bomb', 'bomb', 'bomb:wildbrand', 'bomb', 'bomb:wildbrand',
  'meteor', 'meteor', 'meteor:shower', 'meteor', 'meteor:shower', 'meteor', 'thunder', 'thunder:twice', 'thunder', 'thunder', '@fire',
  '@fire', '@fire', '@fire', '@fire', 'bomb', 'comet', 'comet', 'comet:heavycore', 'firenova', 'firenova', 'firenova:kindled',
  '@lightning', '@lightning', '@lightning', '@lightning', '@lightning', 'thunderclap', 'thunderclap', 'mend', 'mend', 'renew', 'fork', 'fork',
];
// Build focus (the auto-play menu, and Settings: autoFocus): a school of the player's choosing, each a build for that
// school's hardest blows, with Mend first to stay standing. Best: Full Auto's FULL_BUILD, Cinematic's BUILD. Each keeps
// something by level 11 that comes from above or out of the ground, as a raised shield can't turn (the black knight,
// BOSS_LEVEL): Ice a Blizzard, Arcane a Rune, Lightning its Thunderbolt, Fire a Wall of Fire; Earth borrows Lightning's.
export const FOCUS = {
  fire: [
    'firebolt', 'mend', 'comet', 'firebolt', 'firebolt:searing', 'firebeam', 'firenova', 'firebolt', 'wallfire', 'firebolt:searing',
    'firebolt:searing', 'bomb', 'firebolt', 'bomb', 'bomb:wildbrand', 'bomb', 'bomb:wildbrand', 'wyrm', 'meteor', 'meteor', 'meteor:shower',
    'meteor', 'meteor:shower', 'meteor', 'phoenix', '@fire', '@fire', '@fire', '@fire', '@fire', 'bomb', 'comet', 'comet', 'comet:heavycore',
    'firenova', 'firenova', 'firenova:kindled', 'inferno', 'inferno', 'phoenix', 'phoenix', 'phoenix:rebirth', 'wallfire', 'wallfire',
    'firenova', 'firenova', 'comet', 'comet', 'wyrm', 'wyrm', 'wyrm:twin', 'inferno', 'inferno', 'mend', 'mend', 'renew', 'inferno:conflagration', 'phoenix',
  ],
  ice: [
    'frost', 'mend', 'coldcone', 'frost', 'rime', 'frost:piercing', 'nova', 'frost', 'prism', 'nova', 'nova:brittle', 'blizzard', 'shatter',
    'orb', 'shatter', 'shatter', 'orb', 'orb', 'zero', 'zero', 'shatter', 'shatter:chainshatter', 'zero', 'orb', 'orb:wintersheart', 'zero',
    'zero', 'zero:killingfrost', '@ice', '@ice', '@ice', '@ice', '@ice', 'blizzard', 'blizzard', 'blizzard:hail', 'prism', 'prism',
    'prism:refraction', 'prism:refraction', 'nova', 'nova', 'blizzard', 'blizzard', 'frost', 'rime', 'rime', 'rime:splintering', 'rime:splintering',
    'coldcone', 'coldcone', 'coldcone:flash', 'mend', 'mend', 'renew', 'nova', 'prism', 'rime', 'coldcone',
  ],
  earth: [
    'stone', 'mend', 'lance', 'fork', 'spark', 'spark', 'thunderclap', 'spark', 'spark', 'thunder', 'stone', 'stone:heavyhand', 'boulder',
    'spikes', 'boulder', 'boulder', 'vine', 'stone', 'stone:heavyhand', 'stoneskin', 'monolith', 'monolith', 'monolith:toppling', 'monolith',
    'monolith', 'quake', 'quake', 'quake', '@earth', '@earth', '@earth', '@earth', '@earth', 'boulder', 'boulder:momentum', 'boulder:momentum',
    'spikes', 'spikes', 'spikes:aftershock', 'spikes', 'quake', 'quake:chasm', 'stone', 'stone:heavyhand', 'lance', 'lance', 'lance:impale',
    'lance:impale', 'vine', 'vine', 'thunder', 'thunder:twice', 'mend', 'mend', 'renew', 'lance', 'vine',
  ],
  arcane: [
    'arcaneblast', 'mend', 'arcaneblast', 'blink', 'arcaneblast:focused', 'rune', 'crescent', 'arcaneblast', 'rune', 'crescent', 'rune:binding',
    'stasis', 'well', 'stasis', 'crescent', 'crescent:orbit', 'stasis', 'well', 'starfall', 'starfall', 'starfall:greatstar', 'starfall',
    'starfall', 'stasis', 'stasis:echo', '@arcane', '@arcane', '@arcane', '@arcane', '@arcane', 'well', 'well', 'well:crush', 'well:crush',
    'rune', 'rune', 'arcaneblast', 'crescent', 'crescent:orbit', 'blades', 'blades', 'blades:fling', 'blades', 'blades', 'mend', 'mend',
    'renew', 'blink', 'blink:quickstep', 'missiles', 'missiles', 'missiles:arcing', 'disintegrate', 'rune', 'well', 'missiles',
  ],
  lightning: [
    'spark', 'mend', 'fork', 'spark', 'spark:heavy', 'spark', 'thunderclap', 'fork', 'fork:branching', 'spark', 'spark:heavy', 'thunder',
    'thunder', 'thunder:twice', 'thunderclap', 'thunder', 'staticfield', 'thunder', 'tempest', 'tempest', 'tempest:eye', 'tempest', 'tempest',
    '@lightning', '@lightning', '@lightning', '@lightning', '@lightning', 'spark:heavy', 'fork', 'fork', 'thunderclap', 'thunderclap',
    'thunderclap:shockwave', 'staticfield', 'staticfield', 'staticfield:rod', 'staticfield:rod', 'chain', 'lightning', 'lightning', 'lightning',
    'lightning:thunderhead', 'lightning:thunderhead', 'seed', 'seed', 'seed:livewire', 'mend', 'mend', 'renew', 'staticfield', 'lightning', 'seed', 'seed',
  ],
};
// The menu's words for each focus.
export const FOCI = [
  ['best', 'Best', 'Whatever hits hardest: Fire\'s burst, with Lightning\'s Thunderbolt.'],
  ['fire', 'Fire', 'Firebolt, Cinder Brand and Meteor: burst, and the ground left burning.'],
  ['ice', 'Ice', 'Frost Nova, Frozen Orb and Deadwinter: stop them, then break them.'],
  ['earth', 'Earth', 'Boulder, Monolith and Earthquake: the heaviest single blows.'],
  ['arcane', 'Arcane', 'Runes, Stasis and Starfall: hold them still, then rain on them.'],
  ['lightning', 'Lightning', 'Thunderbolt, Static Field and Thunderstorm: strikes that leap.'],
];
// What goes on its bar, in this order, of what it knows: the nine of 1 to 9 hold only what's worth a cast (so a short bar
// early on, not one padded out), and 0, - and + its Mend and whatever of the Utility school keeps it in the fight.
const FULL_PICK = ['firebolt', 'meteor', 'thunder', 'bomb', 'firenova', 'comet', 'thunderclap', 'monolith', 'starfall', 'tempest', 'orb', 'phoenix', 'wyrm',
  'lightning', 'boulder', 'spikes', 'rime', 'lance', 'nova', 'spark', 'stone', 'frost'];
const FULL_UTIL = ['mend', 'renew', 'aegis', 'empower', 'turn'];
// How long a cast holds its hands, start to finish (tools/fp_spells/hands.py: the attack clip runs 0.95 s, the raise 1 s),
// and a gather on top: the only thing between one spell and the next. There's no global cooldown.
const HANDS = { attack: 0.95, raise: 1 };
const BITE_TICK = 0.18;   // a held spell's bite (src/sim/casting.js TICK)
// Mana it wins back a second in a fight, about: the fight's regeneration and the staff's hits (src/sim/spells.js).
const EARN = 6;
// What a cast should do, all told, on the fight as it stands: its blow, times what it'll catch, a frozen mark taking half again.
export function castWorth(sp, c) {
  const key = sp.key;
  let hit = (sp.dmg || 0) + (sp.ringDmg || 0) + (sp.dps || 0) * Math.min(sp.duration || sp.moat || 3, 4);
  if (sp.shards) hit *= sp.shards;
  if (sp.count) hit *= sp.count * 0.35;
  if (sp.shower) hit *= 1 + 0.45 * sp.shower;
  if (sp.twice) hit *= 1 + sp.twice;
  if (sp.beamDmg) hit += sp.beamDmg * Math.min(sp.beams || 0, Math.max(0, (c.inLine || 1) - 1) + 1);
  if (sp.channel) hit = (sp.dmg || 0) / BITE_TICK;   // (a second of it)
  const area = sp.radius || sp.ring || sp.zoneR || 0;
  const many = SELF.has(key) ? c.close : sp.jumps ? Math.min(1 + sp.jumps, c.n) : sp.pierce || sp.beams ? Math.max(1, c.inLine) : area >= 2.5 ? Math.max(1, c.around) : 1;
  if (!many) return 0;
  // (Past what the mark has left, a blow on it alone is wasted.)
  const first = Math.min(hit, Math.max(c.left, 1) * 1.15);
  return (first + (many - 1) * hit * 0.8) * (c.frozen ? 1.5 : 1);
}

// ---------------------------------------------------------------- what it knows, against what the game has

// Everything in the game that auto-play doesn't know how to play: a quest it has no place for in PLAN, a kind of quest step it
// can't do, somewhere it can't find, a foe or a lair it has no measure of, a spell it casts that's gone, a shop it doesn't use.
// Warned in the console when it starts, and the failing list of tools/autoplay/check.mjs. When something's added to the game,
// it's taught here (and the check run), so auto-play keeps playing the whole of it. foeNames: FOE_NAMES from src/main.js.
const STEP_KEYS = new Set(['talk', 'say', 'back', 'bring', 'n', 'enter', 'night', 'visit', 'kill', 'of', 'warden', 'start', 'foe', 'boss', 'end', 'at', 'clear', 'gather', 'what', 'spots']);
// The Test Dungeon's counters (src/core/testhall.js STATIONS), and what auto-play does with each: nothing. In there it fights
// whatever's been summoned, and what that is, what it's wearing and who's with it are for whoever's testing to choose
// (hallRun below). A new counter is named here, with what it's for, or coverage() says so.
const HALL_COUNTERS = { gear: 'left to the tester: it fights in what it was given', party: 'left to the tester: it fights beside whoever was hired', foes: 'left to the tester: it fights what was summoned' };
// The blocks of the snapshot it reads (foes() and the rest); a new one is something in the world it can't see yet.
const BLOCKS = new Set(['FX_START', 'CHARS_START', 'SLIMES_START', 'TUMBLERS_START']);
const CASTS = ['firebolt', 'mend', 'wisp', 'blink', ...PANIC, ...SKY];
// (Drain caps grow on what dies down Phobos's sewers: a bring at a delve is that delve's work, delveWants.)
const FARMS = new Set(['bone', 'iron', 'silk', 'wax', 'cap']);
const STOCKS = new Set(['staffs', 'robes', 'skulls', 'curios', 'scrolls']);
export function coverage(foeNames = null) {
  // (And Phobos's people who keep to a district of their own: it goes there for them, crowdSpot.)
  const out = [], people = new Set([...PEOPLE, ...POSTED, ...BEYOND, LISANDRA, ...CROWD.filter((p) => p.area)].map((p) => p.id));
  for (const id of Object.keys(RULES)) {
    const R = RULES[id];
    if (!(id in LEVEL_OF)) out.push(`quest ${id}: not in PLAN, so it's taken on last, at a guessed level (${guessLevel(id)})`);
    if (!QUESTS[id]?.giver || !people.has(QUESTS[id].giver)) out.push(`quest ${id}: its giver isn't anyone it can find`);
    for (const st of R.steps) {
      for (const k of Object.keys(st)) if (!STEP_KEYS.has(k)) out.push(`quest ${id}: a step with "${k}", which it doesn't know how to do`);
      for (const a of [st.enter, st.kill, st.gather, st.clear && `outpost:${st.clear}`, ...(st.visit || [])].filter((q) => typeof q === 'string')) if (!area(a)) out.push(`quest ${id}: nowhere to walk to for "${a}" (area())`);
      if (st.gather && gatherSpots(id, st).length < st.n) out.push(`quest ${id}: ${st.n} to gather at "${st.gather}", and fewer than that lying there (gatherSpots)`);
      if (st.boss && !BOSSES.some((b) => b.key === st.boss)) out.push(`quest ${id}: a boss, "${st.boss}", that no dungeon has`);
      if (st.kill && st.kill !== 'catacombs' && !huntsFor(st.kill)) out.push(`quest ${id}: no hunting grounds for "${st.kill}" (HUNTS): it hunts round its middle`);
      if (st.bring && !FARMS.has(st.bring)) out.push(`quest ${id}: wants ${st.bring}, which it doesn't know where to farm`);
      if (st.talk && !people.has(st.talk)) out.push(`quest ${id}: a word with "${st.talk}", who isn't anyone it can find`);
    }
  }
  for (const k of WILD_CALLS) if (!WILD_SAY[k] || !(k in WILD_UNDER)) out.push(`the living land's ${k}: it doesn't know what to do when it's called to one (WILD_SAY)`);
  for (const l of LAIRS) if (!(lairLevel(l) > 0)) out.push(`lair ${l.key}: no level in LAIR_LEVEL, so it keeps clear of it till level 10`);
  for (const g of GROUP_KEYS) if (!(GROUPS[g].hp > 0)) out.push(`monster group ${g}: no hp to measure it by`);
  for (const k of Object.keys(LAYOUT)) if (k.endsWith('_START') && !BLOCKS.has(k)) out.push(`snapshot block ${k}: something new in the world it can't see (foes())`);
  for (const k of CASTS) if (!(k in SP)) out.push(`spell ${k}: it casts this, and it's gone from SPELLS`);
  for (const sp of SPELLS) if (!(sp.key in USE)) out.push(`spell ${sp.key}: no use for it in USE, so it never casts it`);
  for (const k of Object.keys(USE)) if (!(k in SP)) out.push(`spell ${k}: a use for it in USE, and it's gone from SPELLS`);
  for (const sp of SPELLS) if (!NODES[sp.key]) out.push(`spell ${sp.key}: in no tree, so it can never be learned`);
  out.push(...buildGaps());
  out.push(...buildGaps(FULL_BUILD, 'its Full Auto build'));
  for (const [k, b] of Object.entries(FOCUS)) out.push(...buildGaps(b, `its ${k} build`));
  for (const k of [...FULL_PICK, ...FULL_UTIL]) if (!(k in SP)) out.push(`spell ${k}: on Full Auto's bar list, and gone from SPELLS`);
  for (const sp of SPELLS) if (!CORE_ALL.includes(sp.key) && !SLOT_A.includes(sp.key) && !SLOT_B.includes(sp.key) && !UTIL_TURN.includes(sp.key) && !OFF_BAR.has(sp.key)) out.push(`spell ${sp.key}: in none of its bar's turning lists (SLOT_A for a crowd, SLOT_B for one mark, UTIL_TURN for 0, - and +), so it's only ever a stopgap on its bar`);
  for (const k of [...CORE_ALL, ...SLOT_A, ...SLOT_B, ...UTIL_TURN]) if (!(k in SP)) out.push(`spell ${k}: on its bar's lists, and gone from SPELLS`);
  // (0, - and + take the Utility school's alone: UTIL_TURN is that school's, and SLOT_A and SLOT_B, for 1 to 9, have none of it.)
  for (const k of UTIL_TURN) if (k in SP && !UTILITY.has(SP[k])) out.push(`spell ${k}: in UTIL_TURN, and not a Utility spell, so 0, - and + won't take it`);
  for (const k of [...SLOT_A, ...SLOT_B]) if (k in SP && UTILITY.has(SP[k])) out.push(`spell ${k}: a Utility spell in SLOT_A or SLOT_B; it belongs in UTIL_TURN, for 0, - and +`);
  for (const [k, t] of Object.entries(TRADES)) if (t.stock && !STOCKS.has(t.stock)) out.push(`trade ${k}: sells "${t.stock}", which it doesn't shop for`);
  out.push(...warrensCoverage());
  // (Every party dungeon is one Dungeon Runs can go round, once its portal's found: DUNGEONS.)
  for (const d of DELVES) if (!DUNGEONS.some((q) => q.key === d.key)) out.push(`dungeon ${d.key}: not in DUNGEONS, so Dungeon Runs never go down it`);
  for (const st of STATIONS) if (!(st.key in HALL_COUNTERS)) out.push(`Test Dungeon counter ${st.key}: nothing in HALL_COUNTERS says what auto-play does with it`);
  if (foeNames) foeNames.slice(0, TRIPO_KIND).forEach((n, k) => { if (n && !KNOWN_KINDS.has(k)) out.push(`foe kind ${k} (${n}): no rule in fightable(), so it's judged by its life alone`); });
  return out;
}

// ---------------------------------------------------------------- the nav thread

class Nav {
  constructor(base, opening) {
    this.ready = false; this.calls = new Map(); this.id = 0; this.spawns = [];
    this.w = new Worker(new URL('../sim/nav.worker.js', import.meta.url), { type: 'module' });
    this.w.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { this.ready = true; this.spawns = m.spawns; this.bounds = m.bounds; return; }
      const c = this.calls.get(m.id);
      if (c) { this.calls.delete(m.id); c(m.result); }
    };
    this.w.onerror = (e) => console.warn('auto-play nav', e.message);
    this.w.postMessage({ type: 'boot', base, opening });
  }

  ask(type, o) {
    return new Promise((resolve) => {
      if (!this.ready) { resolve(null); return; }
      const id = ++this.id;
      // (An answer that never comes, the thread fallen over, is no answer: nothing waits on it for ever. The east's first ask
      // fetches its map, a slow phone's long walk works for a while: more time for those.)
      const late = setTimeout(() => { if (this.calls.delete(id)) resolve(null); }, type === 'east' ? 15000 : 4000);
      this.calls.set(id, (r) => { clearTimeout(late); resolve(r); });
      this.w.postMessage({ type, id, ...o });
    });
  }

  // On the worker's grid: the town and the woods round it, and (below: down there, not on the land over them) the cathedral's
  // floors under the land.
  inGrid(x, z, below = false) {
    if (Math.abs(x) < 246 && Math.abs(z) < 246) return true;
    const b = this.bounds;
    return below && !!b && x > b[0] + 2 && z > b[1] + 2 && x < b[2] - 2 && z < b[3] - 2 && floorAt(x, z) !== null;
  }
}

// ---------------------------------------------------------------- the long way: roads, country, seals

// Somewhere off its nav ground (and anywhere in the woods round the town), it goes as a person would: to the nearest point of
// a road, down the roads, lanes and footpaths to where it's nearest to where it's going, and off the road there. Through the
// woken seals when that's shorter. (It used to go straight across country whenever the roads were half as long again as
// the line, which was most of the time: over the Sorrowhorn from the Bone Fields, through the woods to every lair.)
// (The roads are the land's own graph, src/core/roads.js roadGraph: a node every 20 m down every road, lane and path, joined
// where they meet. A metre across country costs ACROSS of them, so it keeps to the roads unless they go four times as far.
// ONTO: how far off a road it looks for one to get onto, and off it at the far end.)
export const ACROSS = 4;
const ONTO = 260;
// (And ground it's keeping off costs KEEP a metre walked through it, by road or not: a road that runs through a lair for
// 200 m is as dear as a line across it for 200 m.)
const KEEP = 25;
// (A trip on its nav ground shorter than NEAR, or in the town or down under it, is a path straight there: there's no road to
// keep to. Down a road it walks to a point at each bend, where the road leaves the line between two by more than BEND, and
// every LEG metres at most down a straight; each point it's at once within ON of it, or past it.)
const NEAR = 45, BEND = 1, LEG = 30, ON = 2.5;
const segNear = (ax, az, bx, bz, cx, cz) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L));
  return dist(ax + dx * t, az + dz * t, cx, cz);
};

// The ways up to the delves' portals out in the land (src/core/sites.js portalStair): their terraces, and the flight down the
// front of each, worked out the first time they're wanted. On or off one it goes by its steps, square on and up the middle:
// to a few strides out in front of their foot, to the foot, up to their head, and on to the portal (or whoever's on the
// terrace). It used to come at a terrace from wherever its way left the road, and on the town's ground (the Warrens') its
// path took no notice of a terrace at all: it walked into the parapet, hopped, and scrambled up the side.
let STAIRS = null;
export const stairsOf = (x, z) => (STAIRS ||= DELVES.map(portalStair).filter((s) => s.steps)).find((s) => s.on(x, z)) || null;
const upStairs = (s) => [{ x: s.out[0], z: s.out[1], r: 1.2, stair: s.key }, { x: s.foot[0], z: s.foot[1], r: 0.8, stair: s.key, walk: true }, { x: s.head[0], z: s.head[1], r: 0.9, stair: s.key, walk: true }];
const downStairs = (s) => [{ x: s.head[0], z: s.head[1], r: 0.9, stair: s.key, walk: true }, { x: s.foot[0], z: s.foot[1], r: 0.8, stair: s.key, walk: true }, { x: s.out[0], z: s.out[1], r: 1.5, stair: s.key }];

// The nearest point on a road to (x, z) within reach: the stretch it's on (nodes a and b, t of the way from a, its length L)
// and how far it is (d). (Not a join between two ways' ends over open ground: those cost more than they're long.)
function onRoad(G, x, z, reach) {
  const { X, Z, start, nbr, wt, around } = G;
  let best = null, bd = reach;
  around(x, z, reach + 20, (a) => {
    for (let k = start[a]; k < start[a + 1]; k++) {
      const b = nbr[k], dx = X[b] - X[a], dz = Z[b] - Z[a], L = Math.hypot(dx, dz);
      if (L < 0.01 || wt[k] > L * 1.01 + 0.01) continue;
      const t = clamp(((x - X[a]) * dx + (z - Z[a]) * dz) / (L * L), 0, 1), d = dist(X[a] + dx * t, Z[a] + dz * t, x, z);
      if (d < bd) { bd = d; best = { a, b, t, L, d, x: X[a] + dx * t, z: Z[a] + dz * t }; }
    }
  });
  return best;
}

// A line with every point dropped that lies within tol of the straight run past it (Ramer-Douglas-Peucker).
function bends(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let k = -1, kd = tol;
    for (let i = a + 1; i < b; i++) { const d = segNear(pts[a].x, pts[a].z, pts[b].x, pts[b].z, pts[i].x, pts[i].z); if (d > kd) { kd = d; k = i; } }
    if (k > 0) { keep[k] = 1; stack.push([a, k], [k, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// The way from m to end, as the points to walk to: { x, z } each, with r (how near is there), road (on one), stair (a delve's
// steps: walked, square on), seal and to (a seal to step through, and where to). The last is end itself. o: seals (the woken
// ones), avoid (circles to keep out of: [x, z, r]), grid(x, z, below) (on the nav thread's ground), below (m is down under
// the town).
export function planWay(m, end, o = {}) {
  const { seals = [], avoid = [], grid = () => false, below = false } = o;
  // In City State Phobos and Castle Velscour (src/sim/east-nav.js), or bound there: the east's own map walks it, streets,
  // stairs, bridges and all, from the road before the Drawbridge Gate. (The roads stop at the gate; the delves' terraces
  // and steps are on the map.)
  // (The road before the gate is in the east's box itself: it's the meeting of the two maps, on neither side of it, or a way to
  // it went to it by way of it for ever.)
  const ea = inEast(m.x, m.z) && !below && !m.gate, eb = inEast(end.x, end.z) && !end.below && !end.gate;
  // (A delve's steps there are still gone up square on and down, as everywhere: east.bin is the way between them.)
  if (ea || eb) {
    const A = ea ? stairsOf(m.x, m.z) : null, B = eb ? stairsOf(end.x, end.z) : null;
    if (A && A === B) return [end];
    const pre = A ? downStairs(A).filter((q, k, all) => k === all.length - 1 || (q.x - m.x) * A.fx + (q.z - m.z) * A.fz > 0.3) : [], post = B ? upStairs(B) : [];
    const door = { x: EAST_DOOR[0], z: EAST_DOOR[1], r: 6, gate: true };
    if (ea && eb) return pre.concat(post, [end]);
    // (From one map to the other where the road crosses into the east's box, not at the gate: everything inside the box is
    // the east map's, the road in included. Through the gate every time, the Gibbet Field and the carrion under the Sill,
    // inside the box but this side of the city, were gone to by the gate and back up the road, 300 m past them and back, and
    // Wenna on the Sill the same way home: to and fro along the road for good.)
    if (eb) {
      const way = planWay(m, door, o), k = way.findIndex((q) => !q.seal && inEast(q.x, q.z));
      return (k >= 0 ? way.slice(0, k + 1) : way).concat(post, [end]);
    }
    const way = planWay(door, end, { ...o, below: false });
    let k = -1;
    for (let i = 0; i < way.length - 1; i++) if (inEast(way[i].x, way[i].z)) k = i; else break;
    return pre.concat(k >= 0 ? way.slice(k) : [door].concat(way));
  }
  // On a delve's terrace or bound for one: by its steps.
  const A = stairsOf(m.x, m.z), B = stairsOf(end.x, end.z);
  if (A && A === B) return [end];
  // (Down from a terrace: not back to a point of the flight it's already past. Out of a delve it's set down at the head of
  // its steps, a little out past the point there.)
  const pre = A ? downStairs(A).filter((q, k, all) => k === all.length - 1 || (q.x - m.x) * A.fx + (q.z - m.z) * A.fz > 0.3) : [], post = B ? upStairs(B) : [];
  const from = A ? pre.at(-1) : m, to = B ? post[0] : end;
  const tail = B ? post.concat([end]) : [end];
  // On the nav ground: a path straight there, if it's near, or in the town, or under it. Else by the roads.
  if (grid(from.x, from.z, below && !A) && grid(to.x, to.z, !!end.below && !B)
    && ((below && !A) || (end.below && !B) || dist(from.x, from.z, to.x, to.z) < NEAR || (inTown(from.x, from.z, 4) && inTown(to.x, to.z, 4)))) {
    return pre.concat(tail);
  }
  return pre.concat(overRoads(from, to, seals, avoid), tail);
}

// From a to b over the roads (planWay): the points from the first after a, to b (not b itself).
const SEAL_ROAD = new Map();   // (each seal's nearest point of a road: they don't move)
let HOT = null, DIST = null, PREV = null, DONE = null;   // (kept from one way to the next: the graph's the size of the land)
function overRoads(a, b, seals, avoid) {
  const G = roadGraph(), { X, Z, start, nbr, wt, N, around } = G;
  // The graph: the roads, then the ends (here, there, the woken seals) and the nearest point of a road to each.
  const ends = [a, b, ...seals], E = ends.length, e0 = N, r0 = N + E, NP = N + 2 * E;
  // (Far out, with no road that near, the nearest there is: the Sorrowhorn's crown is a kilometre from the stair's head.)
  const snapOf = (p) => onRoad(G, p.x, p.z, ONTO) || onRoad(G, p.x, p.z, 2000);
  const snaps = ends.map((p, k) => (k < 2 ? snapOf(p) : SEAL_ROAD.get(p) ?? (SEAL_ROAD.set(p, snapOf(p)), SEAL_ROAD.get(p))));
  const px = (i) => (i < N ? X[i] : i < r0 ? ends[i - e0].x : snaps[i - r0].x);
  const pz = (i) => (i < N ? Z[i] : i < r0 ? ends[i - e0].z : snaps[i - r0].z);
  // Across country: dearer than a road, and through ground it's keeping off (that neither end is in) dearer still. (The
  // circles by the AC-metre square they reach into: there are hundreds of lairs, and thousands of ways onto the roads.)
  const cells = new Map(), AC = 128;
  avoid.forEach(([x, z, r], k) => {
    for (let i = Math.floor((x - r) / AC); i <= Math.floor((x + r) / AC); i++) for (let j = Math.floor((z - r) / AC); j <= Math.floor((z + r) / AC); j++) {
      const q = i * 100003 + j; if (!cells.has(q)) cells.set(q, []); cells.get(q).push(k);
    }
  });
  const seen = new Uint32Array(avoid.length);
  let look = 0;
  const across = (i, j) => {
    const ax = px(i), az = pz(i), bx = px(j), bz = pz(j);
    let c = dist(ax, az, bx, bz) * ACROSS;
    const i0 = Math.floor(Math.min(ax, bx) / AC), i1 = Math.floor(Math.max(ax, bx) / AC), j0 = Math.floor(Math.min(az, bz) / AC), j1 = Math.floor(Math.max(az, bz) / AC);
    const each = (k) => {
      const [x, z, r] = avoid[k];
      if (dist(ax, az, x, z) <= r || dist(bx, bz, x, z) <= r) return;
      const d = segNear(ax, az, bx, bz, x, z);
      if (d < r) c += KEEP * 2 * Math.sqrt(r * r - d * d);
    };
    look++;
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > avoid.length) { for (let k = 0; k < avoid.length; k++) each(k); return c; }
    for (let ci = i0; ci <= i1; ci++) for (let cj = j0; cj <= j1; cj++) {
      const l = cells.get(ci * 100003 + cj);
      if (l) for (const k of l) if (seen[k] !== look) { seen[k] = look; each(k); }
    }
    return c;
  };
  // (The road nodes near ground it's keeping off, so a stretch of road through it is priced too: each node's circle, and
  // any more than one in `more`.)
  if (!HOT || HOT.length < NP) { HOT = new Int32Array(NP); DIST = new Float64Array(NP); PREV = new Int32Array(NP); DONE = new Uint8Array(NP); }
  const hot = HOT.fill(-1, 0, NP), more = new Map();
  avoid.forEach(([x, z, r], k) => around(x, z, r + 25, (i) => { if (hot[i] < 0) hot[i] = k; else { if (!more.has(i)) more.set(i, []); more.get(i).push(k); } }));
  const inside = (u, v, k) => { const [x, z, r] = avoid[k]; return segNear(px(u), pz(u), px(v), pz(v), x, z) < r; };
  const through = (u, v, c) => {
    for (const n of [u, v]) {
      if (n >= N || hot[n] < 0) continue;
      if (inside(u, v, hot[n])) return c * (1 + KEEP);
      const l = more.get(n);
      if (l) for (const k of l) if (inside(u, v, k)) return c * (1 + KEEP);
    }
    return c;
  };
  const extra = new Map();
  const join = (i, j, c) => { for (const [p, q] of [[i, j], [j, i]]) { if (!extra.has(p)) extra.set(p, []); extra.get(p).push(q, c); } };
  for (let k = 0; k < E; k++) {
    const i = e0 + k, s = snaps[k];
    // Onto the road at its nearest point, and on along it either way from there.
    if (s) { join(i, r0 + k, across(i, r0 + k)); join(r0 + k, s.a, through(r0 + k, s.a, s.L * s.t)); join(r0 + k, s.b, through(r0 + k, s.b, s.L * (1 - s.t))); }
    // (Or onto another a little further off, when that's the better way to go. A seal stands by a road: the roads near it.)
    const reach = k < 2 ? ONTO : 80;
    around(px(i), pz(i), reach, (j) => { if (dist(px(i), pz(i), X[j], Z[j]) < reach) join(i, j, across(i, j)); });
  }
  // Straight across between the ends: there to there always (but at ACROSS, it's only taken when the roads go far round),
  // and to and from a seal near by.
  for (let p = 0; p < E; p++) for (let q = p + 1; q < E; q++) {
    if ((p === 0 && q === 1) || dist(ends[p].x, ends[p].z, ends[q].x, ends[q].z) < 900) join(e0 + p, e0 + q, across(e0 + p, e0 + q));
  }
  // Seal to seal: a step through.
  for (let p = 2; p < E; p++) for (let q = p + 1; q < E; q++) join(e0 + p, e0 + q, 30);
  // The cheapest way (with no seals to step through, aimed: never cheaper than a metre a metre the rest of the way).
  const me = e0, there = e0 + 1, aim = seals.length ? 0 : 1;
  const D = DIST.fill(Infinity, 0, NP), prev = PREV.fill(-1, 0, NP), done = DONE.fill(0, 0, NP);
  const heap = [], hn = [];
  const push = (n, f) => {
    heap.push(f); hn.push(n);
    for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p] <= heap[i]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; [hn[p], hn[i]] = [hn[i], hn[p]]; i = p; }
  };
  const pop = () => {
    const n = hn[0], lf = heap.pop(), ln = hn.pop();
    if (heap.length) {
      heap[0] = lf; hn[0] = ln;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1; let k = i;
        if (l < heap.length && heap[l] < heap[k]) k = l;
        if (r < heap.length && heap[r] < heap[k]) k = r;
        if (k === i) break;
        [heap[k], heap[i]] = [heap[i], heap[k]]; [hn[k], hn[i]] = [hn[i], hn[k]]; i = k;
      }
    }
    return n;
  };
  const relax = (u, v, c) => { if (D[u] + c < D[v]) { D[v] = D[u] + c; prev[v] = u; push(v, D[v] + aim * dist(px(v), pz(v), b.x, b.z)); } };
  D[me] = 0; push(me, 0);
  while (heap.length) {
    const u = pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === there) break;
    if (u < N) for (let q = start[u]; q < start[u + 1]; q++) relax(u, nbr[q], through(u, nbr[q], wt[q]));
    const e = extra.get(u);
    if (e) for (let i = 0; i < e.length; i += 2) relax(u, e[i], e[i + 1]);
  }
  if (!Number.isFinite(D[there])) return [];
  const chain = [];
  for (let k = there; k >= 0 && k !== me; k = prev[k]) chain.push(k);
  chain.reverse();
  chain.pop();   // (b: the caller's)
  // Into points: down a road, a point at each bend and every LEG metres; a seal stepped through, stood on.
  const out = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const kept = bends(run, BEND);
    for (let k = 0; k < kept.length; k++) {
      const q = kept[k], p = k ? kept[k - 1] : out.at(-1);
      // (A long straight cut into LEG metres, so each point's in reach of a short path to it.)
      if (p && k) { const L = dist(p.x, p.z, q.x, q.z), n = Math.ceil(L / LEG); for (let s = 1; s < n; s++) out.push({ x: p.x + (q.x - p.x) * s / n, z: p.z + (q.z - p.z) * s / n, r: ON, road: true }); }
      out.push(q);
    }
    run = [];
  };
  for (let k = 0; k < chain.length; k++) {
    const i = chain[k], next = chain[k + 1];
    if (i < N || i >= r0) { run.push({ x: px(i), z: pz(i), r: ON, road: true }); continue; }
    flush();
    const seal = i - e0 >= 2 ? ends[i - e0] : null;
    // A seal stepped through: stand on it, and the next point is where it lets out.
    if (seal && next !== undefined && next >= e0 + 2 && next < r0) { out.push({ x: seal.x, z: seal.z, seal, to: ends[next - e0] }); continue; }
    out.push({ x: px(i), z: pz(i) });
  }
  flush();
  return out;
}

// ---------------------------------------------------------------- the head

// On the way down with Lisandra: where it gets on its shield (just past the foot of her steps) and where it's off it again
// (in the flat at the foot of that last hill, a little way along), as distances along the way (src/core/escort.js).
const RIDE_FROM = routeNear(WAY[WAY_FOOT][0], WAY[WAY_FOOT][1]) + 2.5, RIDE_TO = routeNear(WAY.at(-1)[0], WAY.at(-1)[1]) + 16;

export class Brain {
  // o: { game, shared, input, pack, inventory, townUI, lands, spellbar, renderer, town, heroCount, base, opening, say(text), menu(), done() }
  constructor(o) {
    this.o = o;
    this.nav = new Nav(o.base, o.opening);
    const gaps = coverage(o.foeNames);
    if (gaps.length) console.warn(`auto-play doesn't know all of the game yet (teach it in src/ui/autobrain.js; node tools/autoplay/check.mjs):\n  ${gaps.join('\n  ')}`);
    this.auto = { mx: 0, mz: 0, run: false, jumpHeld: false, cast: false, block: false };
    this.t = 0;
    this.grind = 'woods';
    this.mode = 'quests';   // MODES: what the menu set it to
    this.bold = false;      // its temperament: careful, or bold (BOLD_LEVELS)
    this.runKey = null; this.laps = 0;
    this.reset();
  }

  reset() {
    Object.assign(this.auto, { mx: 0, mz: 0, run: false, jumpHeld: false, cast: false, block: false });
    this.want = null; this.face = null; this.pitch = 0; this.run = false;
    this.goal = null; this.macro = null; this.sub = null; this.subFor = null; this.probeDir = null; this.probeT = 0;
    this.job = null; this.jobKey = ''; this.thinkT = 0; this.planT = 0;
    this.castT = 0; this.castCool = 0; this.staffCool = 0;
    this.stuck = { t: 0, x: 0, z: 0, n: 0, act: 0, actT: 0, side: 1 };
    this.talk = null; this.waitT = 0; this.hold = 0;
    this.track = new Map();
    this.engage = new Map();   // what it's been fighting, and since when it last hurt it
    this.kite = null; this.kiteCool = 0; this.dodgeCool = 0; this.dodgeSide = 1; this.reactT = 0; this.backedUp = 0; this.esc = null;
    this.guardT = 0; this.guardFor = 0; this.guardCool = 0; this.tapAt = -9; this.staffAt = -9; this.owed = null; this.spellAt = 0; this.comboAt = 0; this.frozenT = -99; this.pulledT = -99; this.fightSince = -99;
    this.sightMap = new Map(); this.sightBusy = false; this.sightT = 0; this.round = null;   // what it has a clean line to
    this.reachMap = new Map(); this.reachBusy = false;                                       // what it could put a hand to
    this.subAsk = false; this.noWay = null; this.wayPoint = null;                            // a path asked for; nowhere to go
    this.pre = null; this.preAsk = false; this.legFrom = null; this.wayT = 0; this.skipAt = null;   // the next point's path, asked early; the last point passed
    this.ride = null; this.rideHold = false; this.rideCool = 8;                              // on the shield in a fight
    this.used = {}; this.pullWait = 0;
    this.wobble = 0; this.wobbleT = 0; this.yawV = 0; this.pitchV = 0; this.surfCool = 0; this.surfAt = -9;
    this.skip = new Map();     // things it's given up on for a while: key -> until
    this.patrol = null; this.wispT = 0; this.gearT = 0; this.strafe = 1; this.strafeT = 0;
    this.lastPos = null; this.lastHpf = 1;
    this.nearFoe = 1e9; this.scene0 = null;
    this.bump = this.bump || {};
    this.runState = null;
    this.fightHere = null; this.seekOn = null;   // Auto Fight: where it was begun, and the one it's going after
  }

  start() { this.reset(); this.o.input.auto = this.auto; }
  stop() {
    this.o.input.auto = null;
    this.letGo();
    this.auto.block = false; this.auto.jumpHeld = false;
    this.ride = null; this.rideHold = false;
    if (this.o.townUI.open) this.o.townUI.close(false);
    if (this.o.lands.isOpen) this.o.lands.close();
  }

  // ---- what it sees

  me(snap) {
    const p = this.o.pack;
    return {
      x: snap[H.PX], y: snap[H.PY], z: snap[H.PZ], hp: snap[H.HP], maxHp: snap[H.MAX_HP] || 1, mana: snap[H.MANA], maxMana: snap[H.MAX_MANA] || 1,
      hpf: snap[H.HP] / (snap[H.MAX_HP] || 1), lvl: p.level + (this.bold ? BOLD_LEVELS : 0), own: p.level, stam: snap[H.STAMINA], opening: snap[H.OPENING], openT: snap[H.OPENING_TIME],
      vx: snap[H.VX], vz: snap[H.VZ], ground: snap[H.ON_GROUND] > 0.5, surf: snap[H.SURF] > 0.5,
      town: inTown(snap[H.PX], snap[H.PZ], 0), below: snap[H.PY] < -6, hour: this.o.renderer.hour,
    };
  }

  // Everything alive that's about: the snapshot's bodies (not the other Tessariels, nor Lisandra), and the jellies.
  foes(snap, m) {
    const out = [], n = snap[H.NCHARS] | 0, last = n - (this.o.heroCount() || 0) - 2;
    for (let i = 0; i < Math.max(0, last); i++) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] < 0.5 || snap[o + C.STATE] === 10 || snap[o + C.HP] <= 0) continue;
      const kind = snap[o + C.KIND] | 0, x = snap[o + C.X], y = snap[o + C.Y], z = snap[o + C.Z];
      const d = dist(m.x, m.z, x, z);
      if (d > 70 || Math.abs(y - m.y) > 8) continue;
      out.push({ id: i, kind, x, y, z, d, hp: snap[o + C.HP], maxHp: snap[o + C.MAX_HP], hostile: snap[o + C.HOSTILE] > 0.5, model: snap[o + C.MODEL] | 0, h: kind >= TRIPO_KIND ? 1.1 : i < 2 ? 1.3 : 0.95, glint: snap[o + C.GLINT], after: snap[o + C.AFTER] });
    }
    for (let i = 0; i < MAX_SLIMES; i++) {
      const o = SLIMES_START + i * SLIME_FLOATS;
      if (snap[o] < 0.5) continue;
      const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3], d = dist(m.x, m.z, x, z);
      if (d > 60 || Math.abs(y - m.y) > 8) continue;
      out.push({ id: 1000 + i, kind: 9, x, y, z, d, hp: 1, maxHp: 1, hostile: d < 14, h: Math.max(0.25, snap[o + 4] * 0.6), slime: true });
    }
    // The tumblers: living stone among the boulders, the Mire Mound under the fen, the crows over the Downs (src/sim/tumblers.js).
    // Asleep they look like any boulder: awake, they glow. Their life is by their size.
    for (let i = 0; i < MAX_TUMBLERS; i++) {
      const o = TUMBLERS_START + i * TUMBLER_FLOATS;
      if (snap[o] < 0.5) continue;
      const x = snap[o + 1], y = snap[o + 2], z = snap[o + 3], R = snap[o + 4], d = dist(m.x, m.z, x, z);
      if (d > 60 || Math.abs(y - m.y) > 20) continue;
      const size = Object.values(TUMBLER_SIZES).reduce((a, b) => (Math.abs(b.R - R) < Math.abs(a.R - R) ? b : a));
      out.push({ id: 2000 + i, kind: 99, x, y, z, d, hp: 1, maxHp: size.hp, hostile: snap[o + 6] > 0.05, h: R, tumbler: true, slime: false });
    }
    // Where each was a moment ago: how it's moving, to lead it.
    const now = this.t;
    for (const f of out) {
      const k = this.track.get(f.id);
      if (k && now - k.t > 0.05) { const a = Math.min(1, (now - k.t) * 4); f.vx = (k.vx || 0) * (1 - a) + (f.x - k.x) / (now - k.t) * a; f.vz = (k.vz || 0) * (1 - a) + (f.z - k.z) / (now - k.t) * a; } else { f.vx = k?.vx || 0; f.vz = k?.vz || 0; }
      if (!k || now - k.t > 0.05) this.track.set(f.id, { x: f.x, z: f.z, t: now, vx: f.vx, vz: f.vz });
    }
    return out;
  }

  // Its party (src/sim/hero.js companion, src/ui/party.js): where each one is, what they're for, how they are, and what
  // they're on. idx: their place in the snapshot, as a foe's `after` names them.
  party(snap) {
    const out = this.partyList || (this.partyList = []);
    out.length = 0;
    const nh = this.o.heroCount() || 0;
    if (!nh) return out;
    const nk = (snap[H.NCHARS] | 0) - nh - 2;
    for (let i = 0; i < nh; i++) {
      const co = CHARS_START + (nk + i) * C_SIZE, o = co + C_HERO;
      if (snap[o + 12] < 0.5) continue;
      // (lead: wanting by, to take the lead: src/sim/hero.js boardLeads and heel. letPass.)
      out.push({ idx: nk + i, x: snap[o + 2], y: snap[o + 3], z: snap[o + 4], hpf: snap[o + 5], dead: snap[o + 9] > 0.5,
        role: ROLE[snap[o + 13] | 0], foe: snap[co + C.AFTER] | 0, lead: snap[o + 12] > 1.5 });
    }
    return out;
  }

  // Whom to shoot when there's a party at its back, as a player in a group would (null when nothing calls for it, and the
  // fight goes as it would alone). First what's on the healer or one of the others, the healer first, then whoever's
  // lowest: the tank wants what's on him, so that's left to him. Then what the tank's holding, so the damage all goes on
  // one, and nothing it pulls is something the tank hasn't got. What's on itself, and close, it deals with as ever.
  helpPick(live, m) {
    const party = this.party(this.snap).filter((h) => !h.dead);
    if (!party.length) return null;
    const by = new Map(party.map((h) => [h.idx, h]));
    let peel = null, ps = -Infinity;
    for (const f of live) {
      const h = by.get(f.after);
      if (!h || h.role === 'tank' || !f.hostile) continue;
      // (The healer first, then whoever's lowest; something already at them before something on its way.)
      const s = (h.role === 'heal' ? 2 : 0) + (1 - h.hpf) * 3 - dist(f.x, f.z, h.x, h.z) * 0.08 - f.d * 0.02;
      if (s > ps) { ps = s; peel = { f, h }; }
    }
    const mine = live.find((f) => f.after === -1 && f.d < 6);
    if (peel && !mine) return { T: peel.f, why: `Taking ${this.foeName(peel.f)} off ${peel.h.role === 'heal' ? 'the healer' : 'one of the party'}.` };
    if (mine) return null;
    const tank = party.find((h) => h.role === 'tank');
    const held = tank && live.find((f) => f.id === tank.foe);
    if (held) return { T: held, why: `On the tank's ${this.foeName(held)}.` };
    return null;
  }

  // A party that can take a fight with it: two or more standing and near, a tank among them.
  partyStrong(m) {
    if (!this.snap) return false;
    const up = this.party(this.snap).filter((h) => !h.dead && h.hpf > 0.35 && dist(h.x, h.z, m.x, m.z) < 30);
    return up.length >= 2 && up.some((h) => h.role === 'tank');
  }

  // Its tank, standing and near: somewhere to back off to, so what's on it comes within his reach (he turns whatever's loose
  // on the rest of them onto himself).
  tankNear(m) {
    if (!this.snap) return null;
    const t = this.party(this.snap).find((h) => h.role === 'tank' && !h.dead && h.hpf > 0.3);
    return t && dist(t.x, t.z, m.x, m.z) < 26 ? t : null;
  }

  // The posts and lairs it should keep clear of at this level, as circles. A lair's is as far as it stands up (its wake): it
  // looks for nothing to hunt there, and no chest. Going by one (passing: its way, and the paths it walks) it keeps only out
  // of their sight (lairPass): a roadside lair stands 45 to 110 m off its road so a traveller can go by, and when the whole
  // wake was kept clear of, nearly every road out of the town was, and it went across country instead.
  avoid(m, passing = false) {
    const out = [];
    for (const [x, z, r, lvl] of POSTS) {
      // (The black knight's door is open ground once he's down, his loot and all.)
      if (x === CATHEDRAL_GUARD.x && z === CATHEDRAL_GUARD.z && !this.blackKnight(this.snap)) continue;
      if (m.lvl < lvl) out.push([x, z, r]);
    }
    const qg = this.questGround(m);
    for (const l of LAIRS) if (m.lvl < (lairLevel(l) || 10) && !(qg && dist(l.x, l.z, qg.x, qg.z) < 30)) out.push([l.x, l.z, passing ? lairPass(l) : (l.wake || 110) + 15]);
    return out;
  }

  // The ground the quest it's working on has sent it to fight on (a lair's, a den's, the things to gather round one), once
  // it's of the level the quest is wanted at: { x, z, r }, or null. What stands there is fought (combat) and its ground
  // isn't kept clear of (avoid), whatever the lair's own level.
  questGround(m) {
    const j = this.job, id = j?.quest;
    if (!id || !j.why?.startsWith('q:') || (j.kind !== 'hunt' && j.kind !== 'go') || m.lvl < questLevel(id)) return null;
    const st = this.o.townUI?.quests?.step?.(id), k = st && (st.clear ? `outpost:${st.clear}` : st.gather || st.kill);
    if (typeof k !== 'string' || !(k.startsWith('lair:') || k.startsWith('outpost:'))) return null;
    const a = area(k);
    return a ? { x: a.x, z: a.z, r: 95 } : null;
  }

  // Inside ground it's keeping clear of (a knight's post, a lair it isn't ready for).
  kept(m, x, z) {
    if (!this.avoidFor || this.t - this.avoidFor.t > 2) this.avoidFor = { t: this.t, list: this.avoid(m) };
    return this.avoidFor.list.some(([ax, az, r]) => dist(x, z, ax, az) < r);
  }

  skipping(k) { const u = this.skip.get(k); return u !== undefined && u > this.t; }
  giveUp(k, secs) { this.skip.set(k, this.t + secs); }

  say(text) { if (text !== this.said) { this.said = text; this.o.say(text); } }

  // ---- each frame

  step(dt, snap) {
    this.t += dt;
    this.snap = snap;
    const m = this.me(snap);
    const g = this.o.game;
    // Fallen, with no opening to catch it (?noopening): up again, as R does.
    if (snap[H.GAME] === 2) {
      this.halt();
      this.say('Fallen.');
      if ((this.fallenT = (this.fallenT || 0) + dt) > 3) { this.fallenT = 0; this.o.shared.input[INPUT.RESTART] += 1; }
      return;
    }
    // Something came between, a long way at once: a fall caught (back at the town's edge), a seal, a sleep. Plan afresh.
    if (this.lastPos && dist(this.lastPos[0], this.lastPos[1], m.x, m.z) > 25) {
      // Caught falling, and set down by the town: whatever it was at was too much for it yet. Two levels more first.
      // (Not the beacon stone setting it down by the seal: that's on purpose, however hurt it was.)
      const beaconed = performance.now() - (g.beacon?.arrivedAt ?? -1e9) < 4000;
      const fell = this.lastHpf < 0.35 && townDist(m.x, m.z) < 40 && !beaconed;
      // (Auto Fight: set down somewhere else on purpose, a seal, the stone, the skull's teleport, it fights there now. Caught
      // falling, it goes back to where it was.)
      if (!fell) this.fightHere = null;
      if (fell && this.job) {
        const why = this.job.why;
        this.o.log?.fell(m, m.own, this.job.say, why.startsWith('q:') ? why.slice(2) : null);
        this.bump[why] = (this.bump[why] || 0) + (this.bold ? 1 : 2);
        this.o.event?.('fell', { say: this.job.say });
        this.giveUp(why, 300);
        this.o.note?.(`Auto-play: beaten back. ${this.job.say ? 'It will come back to that stronger.' : ''}`);
      }
      this.goal = null; this.macro = null; this.sub = null; this.job = null; this.patrol = null;
    }
    this.lastPos = [m.x, m.z]; this.lastHpf = m.hpf;
    this.o.log?.tick(dt, m, this.o.pack, this.o.townUI.quests, !!this.fighting);
    if (this.hold > 0) { this.hold -= dt; this.halt(); this.motor(dt, m); return; }
    // A panel up: the talk is its own, the rest it shuts.
    if (this.o.townUI.open) { this.halt(); this.converse(dt, m); this.motor(dt, m); return; }
    if (this.talk && !this.o.townUI.open) this.talk = null;
    // A quartermaster's books open: the party chosen, then shut (src/ui/autowarrens.js).
    if (g.party?.open) { hiring(this); this.motor(dt, m); return; }
    if (this.o.lands.isOpen) { this.halt(); if (this.sealTo || this.t - (this.sealT ?? -99) < 4) this.travelling(); return; }
    if (this.o.inventory.open || this.o.townUI.book) { this.halt(); return; }
    this.castT -= dt; this.castCool -= dt; this.staffCool -= dt;
    // (A key held past its time, or a channel run dry, is let go: held on, it would only fizzle.)
    if (this.castT <= 0 || ((this.slotHeld || this.auto.cast) && snap[H.MANA] < 4)) this.letGo();
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.12; this.think(snap, m); }
    this.boardFrame = false;
    this.walk(dt, m);
    // (The ride down behind Lisandra, asked for by the opening's thinking: src/ui/autobrain.js opening.)
    if (this.wayRide) { const r = this.wayRide; this.board(dt, m, r.rx, r.rz, r.left, (k) => routeAt(Math.min(ROUTE.len, r.mine + k))); }
    // (Space is only held while it's on the shield, or getting on it: on its way somewhere, or riding it through a fight.)
    if (this.rideHold && !this.fighting) { this.rideHold = false; this.ride = null; }
    if (this.rideHold) this.auto.jumpHeld = true;
    else if (!this.boardFrame) this.auto.jumpHeld = false;
    if (!this.fighting && this.auto.block) { this.auto.block = false; this.guardT = 0; }
    this.letPassFor(dt, m);
    this.motor(dt, m);
    // (Each as Settings allows: What auto-play sees to by itself, src/title.js AI_PARTS.)
    if ((this.gearT -= dt) <= 0 && !this.fighting) {
      this.gearT = 4;
      this.dress();
      if (this.allow('aiSkills')) { if (!this.unspecT || this.t - this.unspecT > 60) this.restyle(); this.learn(); }
      if (this.allow('aiBar')) this.bar();
      this.o.party?.(this);
    }
    // A light underfoot down among the dead, for whoever's watching.
    if (m.below && !this.fighting && (this.wispT -= dt) <= 0 && m.mana > 40) { this.wispT = this.cast(SP.wisp, 0.3) ? 85 : 2; }
    void g;
  }

  // One of its party wanting by, to take the lead for a while (src/sim/hero.js boardLeads, heel): it eases off and lets them,
  // as you would, for a few seconds at most and not again straight away (motor: a walk for a run, and on the shield a heel
  // dragged now and then). Not in a fight, in town or below.
  letPassFor(dt, m) {
    this.letPassCd = (this.letPassCd || 0) - dt;
    const wants = !this.fighting && !m.town && !m.below && !!this.snap && this.party(this.snap).some((h) => h.lead && !h.dead && dist(h.x, h.z, m.x, m.z) < 30);
    if (this.letPass > 0) {
      this.letPass -= dt;
      // (Done when they're by: nobody wanting by for a moment, not a single thought that missed them.)
      this.letPassNone = wants ? 0 : (this.letPassNone || 0) + dt;
      if (this.letPassNone > 0.6 && this.letPass < 6.4) this.letPass = 0;
      if (this.letPass <= 0) { this.letPass = 0; this.letPassCd = 5; }
    } else if (wants && this.letPassCd <= 0) { this.letPass = 7; this.letPassNone = 0; this.letPassV = Math.hypot(m.vx, m.vz); this.say('Easing off: one of the party is taking the lead.'); }
  }

  // Stand still. (A cast under way is let go when its time is up, not here.)
  halt() { this.want = null; this.look = null; this.auto.mx = 0; this.auto.mz = 0; this.auto.run = false; }

  // ---- thinking

  think(snap, m) {
    const g = this.o.game;
    this.fighting = false;
    this.wayRide = null;
    this.useGoal = false;
    this.aim = null;
    // The opening has its own way to go.
    if (m.opening > 0 && m.opening < OPENING.ARRIVED) { this.opening(snap, m); return; }
    const foes = this.foes(snap, m);
    // (Auto Fight: the ground it fights over is where it was when it began, before the first fight carries it off.)
    if (this.mode === 'fight' && !this.fightHere) this.fightHere = { x: m.x, z: m.z, y: m.y };
    this.nearFoe = foes.reduce((a, f) => Math.min(a, f.d), 1e9);
    // The beacon stone at work: still for it, unless something's on it (then the fight comes first, and the stone goes quiet).
    if (g.beacon?.busy && this.nearFoe > BEACON_HOLD) {
      this.halt();
      this.say(`The beacon stone: home to Bellmourn in ${Math.max(0, Math.ceil(CHANNEL - (g.beacon.on?.t || 0)))} s.`);
      return;
    }
    // Down the Warrens, a boss's calls come first: out of the circles, at the dragon's side, behind a pillar.
    // (And anywhere, out of what a monster has marked on the ground or thrown: src/ui/autowarrens.js perilStep.)
    if ((inDungeon(m.x, m.z) || perilsNear(this)) && this.delve(snap, m, foes)) { this.fighting = true; return; }
    // In the Test Dungeon: what's been summoned, and nothing else (hallRun).
    if (inHall(m.x, m.z)) { this.hallRun(snap, m, foes); return; }
    // A fight, or getting away from one.
    if (!m.town && this.combat(snap, m, foes)) { this.fighting = true; return; }
    // Hurt and out of it: mend, or rest a little.
    // (Low and out of the fight: a Mend, now and then. Otherwise its life comes back on its own, given a few quiet seconds.)
    if (m.hpf < 0.45 && m.mana >= 30 && this.known(SP.mend) && this.t >= (this.mendAt || 0) && !m.town) { this.face = null; this.halt(); if (this.cast(SP.mend, 0.35)) this.mendAt = this.t + 4; this.say('Mending.'); return; }
    // One of its party down: they get up a few seconds after the fight's over (src/sim/hero.js stepCompany), so it stays by
    // them till they do rather than leave them behind. (Ten seconds at most.)
    const fallen = m.town ? null : this.party(snap).find((h) => h.dead && dist(h.x, h.z, m.x, m.z) < 40);
    if (fallen && (this.fallenWait = (this.fallenWait || 0) + 0.12) < 10) { this.halt(); this.face = Math.atan2(fallen.x - m.x, fallen.z - m.z); this.say('Waiting for the party to get up.'); return; }
    if (!fallen) this.fallenWait = 0;
    // What's underfoot, and the chests near by: out in the land, and in the town's houses.
    if (this.loot(m, foes)) return;
    // The job in hand, or a new one.
    if ((this.planT -= 0.12) <= 0 || !this.job) { this.planT = 1.2; this.plan(m); }
    this.doJob(snap, m, foes);
    void g;
  }

  // The Test Dungeon (src/core/testhall.js): it fights whatever has been summoned, and never summons anything itself. With the
  // door up it goes in after what's left; otherwise it comes back to the hall, mends, and waits for the next summoning.
  hallRun(snap, m, foes) {
    if (this.combat(snap, m, foes)) { this.fighting = true; return; }
    if (this.loot(m, foes)) return;
    const st = this.o.game.hallUI?.hall?.state || 'shut';
    const left = foes.filter((f) => inArena(f.x, f.z)).sort((a, b) => a.d - b.d)[0];
    if (st === 'open' && left) { this.goTo(left.x, left.z, 7, true); this.say('Into the arena after them.'); return; }
    if (m.hpf < 0.7 && m.mana >= 30 && this.known(SP.mend) && this.t >= (this.mendAt || 0)) { this.face = null; this.halt(); if (this.cast(SP.mend, 0.35)) this.mendAt = this.t + 4; this.say('Mending.'); return; }
    const [x, z] = hallAt(0, 18);
    this.goTo(x, z, 3, false);
    this.say(st === 'shut' ? 'In the Test Dungeon, waiting for a summoning.' : 'Back through the door.');
  }

  known(i) { return this.o.spellbar.known.has(i); }

  // Whether Settings leave this to it (src/title.js AI_PARTS: aiGear, aiGems, aiSkills, ...). Anything not set is allowed.
  allow(k) { return this.o.settings?.[k] !== 'off'; }
  // Settings, Auto combat style: Full Auto fights to win, Cinematic (as it came) to be watched.
  get full() { return this.o.settings?.autoStyle === 'full'; }
  // Settings (and the auto-play menu), Build focus: a school, or 'best'.
  get focus() { const f = this.o.settings?.autoFocus; return FOCUS[f] ? f : 'best'; }
  // The build it spends its points on: the focus's, or the style's own best.
  buildList() { return FOCUS[this.focus] || (this.full ? FULL_BUILD : BUILD); }

  // ---- spells and the staff

  // Its points, spent in the book as a player spends theirs: the next thing in its build that can be bought, one a look.
  learn() {
    const S = this.o.spellbar.skills;
    if (!S || S.points <= 0) return;
    const seen = {};
    let id = null, saving = false;
    for (const q of this.buildList()) {
      if (!NODES[q]) continue;
      seen[q] = (seen[q] || 0) + 1;
      if (S.rank(q) >= seen[q] + (S.free.has(q) ? 1 : 0)) continue;     // (bought already)
      if (!S.why(q)) { id = q; break; }
      saving = true;                                                     // (not yet: a level, or points in its school)
    }
    // (Nothing left to save for, or three points lying idle: into the known spell with the fewest ranks.)
    if (!id && (!saving || S.points >= 3)) id = Object.values(NODES).filter((n) => n.kind === 'spell' && S.rank(n.id) > 0 && !S.why(n.id)).sort((x, y) => S.rank(x.id) - S.rank(y.id))[0]?.id;
    if (!id) return;
    const first = NODES[id].kind === 'spell' && S.rank(id) === 0;
    if (S.spend(id)) { this.o.log?.learned?.(id, S.rank(id), this.o.pack.level); this.say(first ? `Learning ${SPELLS[NODES[id].spell].name}.` : 'A point spent in the book.'); if (first) this.o.event?.('spell', { name: SPELLS[NODES[id].spell].name }); }
  }

  // Full Auto or a focus, chosen with points already spent on something else (by hand, or another build): it unlearns the
  // lot, paying the book's fee as a player would, and spends them again on the build it's been given. Once a choosing;
  // never without the gold (it asks again in a minute); never for a point or two astray. (Cinematic on Best keeps what's
  // there and builds on it, as it always has.)
  restyle() {
    const style = `${this.full ? 'full' : 'cinematic'}:${this.focus}`;
    if (this.specFor === style) return;
    this.specFor = style;
    const S = this.o.spellbar.skills;
    if ((!this.full && this.focus === 'best') || !S) return;
    const want = {};
    for (const q of this.buildList()) if (NODES[q]) want[q] = (want[q] || 0) + 1;
    let astray = 0;
    for (const id of Object.keys(S.ranks || {})) astray += Math.max(0, S.rank(id) - (S.free.has(id) ? 1 : 0) - (want[id] || 0));
    if (astray < 3) return;
    const fee = S.respecCost;
    if (!this.o.pack.pay(fee * 10)) { this.specFor = null; this.unspecT = this.t; this.o.note?.(`Auto-play: not the ${fee} gold to unlearn its points for the new build yet. It builds on what it has meanwhile.`); return; }
    S.unlearn();
    const name = FOCI.find(([k]) => k === this.focus)?.[1];
    this.say(this.focus === 'best' ? 'Unlearning it all, for a build that hits harder.' : `Unlearning it all, to begin again in ${name}.`);
    this.o.note?.(`Auto-play: every point unlearned (${fee} gold), to spend them on its ${this.focus === 'best' ? 'own' : name} build.`);
  }

  // What its bar is filled from, in order, for Full Auto: Best's own list (FULL_PICK); a focus, its school's spells from its
  // build, the highest tier first (what it's built for), then the rest of FULL_PICK for whatever else it knows.
  pickList() {
    const b = FOCUS[this.focus];
    if (!b) return FULL_PICK;
    const mine = [...new Set(b.filter((q) => NODES[q]?.kind === 'spell'))].filter((k) => SP[k] !== undefined && !UTILITY.has(SP[k]) && !SPELLS[SP[k]].channel && !OFF_BAR.has(k) && k !== 'blink')
      .sort((x, y) => NODES[y].tier - NODES[x].tier);
    return [...mine, ...FULL_PICK.filter((k) => !mine.includes(k))];
  }

  // Full Auto's bar: what pays, in its pick list's order, and nothing it won't cast. What's left of the nine stays empty.
  fullBar() {
    const sb = this.o.spellbar, ALL = sb.loadout.length, MAIN = Math.min(ALL, sb.main ?? ALL), ROOM = ALL - MAIN;
    const party = this.snap ? this.party(this.snap).filter((h) => !h.dead) : [];
    const healer = party.some((h) => h.role === 'heal');
    const ok = (k) => SP[k] !== undefined && sb.known.has(SP[k]) && !SPELLS[SP[k]].noBar;
    const util = FULL_UTIL.filter((k) => ok(k) && !(k === 'mend' && healer)).map((k) => SP[k]);
    const nine = this.pickList().filter(ok).map((k) => SP[k]).filter((i) => !(ROOM > 0 && UTILITY.has(i))).slice(0, MAIN);
    // (No Utility slots, as an older bar: Mend goes in the nine.)
    if (ROOM === 0 && util.length && nine.length < MAIN) nine.push(util[0]);
    const three = ROOM > 0 ? util.slice(0, ROOM) : [];
    for (let k = 0; k < MAIN; k++) { const i = nine[k] ?? -1; if (sb.loadout[k] !== i) sb.assign(k, i); }
    for (let k = 0; k < ROOM; k++) { const i = three[k] ?? -1; if (sb.loadout[MAIN + k] !== i) sb.assign(MAIN + k, i); }
    this.stormOnBar = STORM.some((k) => sb.loadout.includes(SP[k]));
  }

  // Its bar, set in the book as a player sets theirs from what it's learned: the nine of 1 to 9 between them cover a fight,
  // and the three of 0, - and + (the Utility school's alone: src/ui/spellbar.js) keep it standing. The nine: what it leans on
  // (Firebolt to open and from range; the first it knows of a Frost Nova or a Thunderclap, for when they're on it; the first
  // it knows of a Meteor or a Thunderbolt, for a crowd, something big or a raised shield), then one for a crowd or a line of
  // them (SLOT_A) and one to pour on a single mark or get it out of trouble (SLOT_B), turn about till they're full. The
  // three: Mend and Turn the Dead when it knows them, then the rest of the school (UTIL_TURN). What's on in turn changes
  // every four minutes among what it knows, so that in time every spell has been in its hands (and in the log). With a
  // healer at its back, Mend's place goes to another, and with a tank holding them still, the nine lean to the crowd.
  bar() {
    if (this.full) { this.fullBar(); return; }
    const sb = this.o.spellbar, known = [...sb.known].sort((a, b) => a - b);
    const party = this.snap ? this.party(this.snap).filter((h) => !h.dead) : [];
    const healer = party.some((h) => h.role === 'heal'), tank = party.some((h) => h.role === 'tank');
    const usable = (i) => i !== undefined && sb.known.has(i) && !SPELLS[i].noBar && USE[SPELLS[i].key];
    // (A bar with no Utility slots, as an older one: everything goes in its one row.)
    const ALL = sb.loadout.length, MAIN = Math.min(ALL, sb.main ?? ALL), ROOM = ALL - MAIN;
    const util = (i) => ROOM > 0 && UTILITY.has(i), fight = (i) => !util(i);
    const core = coreOf((k) => sb.known.has(SP[k])).filter((k) => !(k === 'mend' && healer)).map((k) => SP[k]).filter(usable);
    const nine = core.filter(fight), three = core.filter(util).slice(0, ROOM);
    this.stormOnBar = STORM.some((k) => sb.loadout.includes(SP[k]));
    const turn = Math.floor((this.o.log?.d.t ?? this.t) / 240);
    const taken = (i) => nine.includes(i) || three.includes(i);
    // (n more of the list into the row, those it knows of it taking their turn: from this four minutes' place in it on.)
    const take = (list, n, row, ok) => {
      const have = list.map((k) => SP[k]).filter((i) => usable(i) && ok(i) && !taken(i));
      for (let k = 0; k < have.length && n > 0; k++) { const i = have[(turn + k) % have.length]; if (!taken(i)) { row.push(i); n--; } }
    };
    // (A tank holding them in a knot: two for the crowd first. Then one of each kind, turn about, till the nine are full.)
    take(SLOT_A, tank && healer ? 2 : 1, nine, fight);
    take(SLOT_B, 1, nine, fight);
    for (let was = -1; nine.length < MAIN && nine.length !== was;) {
      was = nine.length;
      take(SLOT_A, 1, nine, fight);
      if (nine.length < MAIN) take(SLOT_B, 1, nine, fight);
    }
    // (Anything else it knows, to fill what's left of the nine.)
    for (const i of known) if (nine.length < MAIN && usable(i) && fight(i) && !taken(i)) nine.push(i);
    // The three: Turn the Dead when it has it, then the rest of the school in turn. (A bar with no three: they're in the
    // row, after the rest.) And a Utility spell the three have no room for goes in the nine, if there's room there.
    take(['turn'], ROOM - three.length, three, util);
    take(UTIL_TURN, ROOM - three.length, three, util);
    take(UTIL_TURN, MAIN - nine.length, nine, (i) => i >= 0);
    nine.slice(0, MAIN).forEach((i, k) => { if (sb.loadout[k] !== i) sb.assign(k, i); });
    three.forEach((i, k) => { if (sb.loadout[MAIN + k] !== i) sb.assign(MAIN + k, i); });
  }

  // A cast: from its slot on the bar if it's there (the slot's key, as 1 to 9, 0, - and + do), else chosen in the book and
  // cast with F.
  // What's held is held for `hold` seconds: a Firebolt gathering, a channel pouring. Anything else is a tap, the key down
  // and up again, as a player hits it: held, a key casts again the moment the first is done, and a hitch in the frames
  // while it's down casts the spell over and over till the mana's gone. True if it went.
  cast(i, hold) {
    if (!this.known(i) || this.auto.cast || this.slotHeld) return false;
    // (Its numbers as it casts it now, with the ranks it has: src/ui/spellbar.js def.)
    const m = this.o.game.currentSnap(), sb = this.o.spellbar, sp = sb.def?.(i) || SPELLS[i];
    // (Not the mana for it, or it isn't ready again yet.)
    if (m && (this.purse(m[H.MANA]) < sp.mana || m[H.COOL + i] > 0)) return false;
    // (Its hands still on the last one, or a shot still leaving the staff: a press now would wait on it and might be lost.
    // The next thought, then.)
    if (m && m[H.SPELL_RIG] > 0) return false;
    const tap = !(sp.channel || sp.gather);
    if (tap && this.t - (this.staffAt ?? -9) < 0.45) return false;
    if (m) this.owed = { t: this.t, cost: sp.mana, from: m[H.MANA] };
    const k = sb.loadout.indexOf(i);
    if (k >= 0) { sb.press(k, 'auto'); if (tap) sb.release('auto'); else this.slotHeld = true; }
    else { sb.pick(i); this.o.input.fire(INPUT.CAST_N); if (!tap) this.auto.cast = true; }
    this.castT = tap ? 0 : hold;
    this.tapAt = tap ? this.t : -9;
    this.lastSpell = sp.key;
    this.used[sp.key] = this.t;
    if (ICED.has(sp.key)) this.iceT = this.t;
    this.o.log?.cast(sp.key);
    return true;
  }

  // Its mana, less what it has already spent that the snapshot hasn't caught up with: a staff shot on its way out of the
  // staff's head, a spell asked for and not yet begun. (Spent twice, the second fizzles in its hands: "Not enough mana.")
  purse(mana) {
    if (this.t - (this.staffAt ?? -9) < 0.9) mana -= 6;
    const o = this.owed;
    if (o && this.t - o.t < 0.9 && mana > o.from - o.cost * 0.5) mana -= o.cost;
    return mana;
  }

  letGo() {
    this.auto.cast = false;
    if (this.slotHeld) { this.o.spellbar.release('auto'); this.slotHeld = false; }
  }

  // What to throw now: the spell on its bar that suits the moment best (a little at random, not the same one every time, and
  // sooner one that hasn't been in its hands for a while), or a shot of the staff between spells, as a player clicks while a
  // spell's cooling. c: the fight as it stands (USE). Nothing leaves its hands without a clean line to its mark (c.aimed).
  shoot(snap, m, c) {
    if (this.auto.cast || this.slotHeld || snap[H.CAST_HELD] > 0.5 || snap[H.SWINGING] > 0.5) return;
    if (this.full) { this.fullShoot(snap, m, c); return; }
    const mana = this.purse(m.mana), bar = this.o.spellbar.loadout;
    const has = (k) => SP[k] !== undefined && bar.includes(SP[k]);
    // What's kept back for trouble: a Mend when it's been hurt, a Nova when it's alone among several.
    const reserve = (has('mend') && m.hpf < 0.8 ? 25 : 0) + (PANIC.some(has) && c.n >= 3 && !c.party ? 12 : 0);
    const staff = () => {
      // (A shot always goes, for nothing and weaker with no mana for it, and one that lands gives mana back: the staff is
      // what it does when it's dry, and how it earns the next spell. src/sim/spells.js DRY_BITE, STAFF_GIVE.)
      if (!c.aimed || this.staffCool > 0 || c.d > IN) return;
      // (The last of its mana is for a Mend, when it's low.)
      if (m.hpf < 0.45 && has('mend') && mana < 31 && mana >= 24) return;
      // (A spell just asked for and not yet begun: a click now would get in ahead of it, and the spell would be lost.)
      if (this.t - this.tapAt < 0.4 && snap[H.SPELL_RIG] < 0.5) return;
      this.o.shared.input[INPUT.ATTACK] += 1;
      this.staffCool = 0.6 + Math.random() * 0.4;
      this.staffAt = this.t;
      this.o.log?.cast('staff');
    };
    if (this.castCool > 0) { staff(); return; }
    let best = null, bs = 0;
    for (const i of bar) {
      const sp = i >= 0 ? this.o.spellbar.def?.(i) || SPELLS[i] : null, U = sp && USE[sp.key];
      // (A channel drinks as it pours: only with enough for a second of it at least, past what it costs to start. And nothing
      // that isn't ready again yet.)
      if (!U || mana < sp.mana + (sp.channel ? (sp.drain || 10) * 1.1 : 0) || snap[H.COOL + i] > 0) continue;
      if (!SELF.has(sp.key) && !c.aimed) continue;
      let s = U(c, this) || 0;
      if (!s) continue;
      if (c.shield && BOLTS.has(sp.key)) s *= 0.25;
      // (Not a Meteor's worth of mana on something nearly dead and alone: the staff finishes it.)
      const grand = HEAVY.has(sp.key) || SKY.includes(sp.key);
      if (sp.mana >= 28 && !SELF.has(sp.key) && c.around < 2 && c.left < (sp.dmg || 40) * 0.4 && !(grand && c.finisher)) s *= 0.35;
      // (Its heaviest to open on a crowd or something big, and to end something big: the blow worth watching.)
      if (grand && (c.opener || c.finisher)) s = Math.max(s, 3.6) * (c.finisher ? 2.4 : 1.7);
      const idle = this.t - (this.used[sp.key] ?? -90);
      s *= (0.85 + Math.random() * 0.3) * (this.lastSpell === sp.key ? 0.7 : 1) * (1 + Math.min(0.3, idle / 150));
      // (What it keeps back, it keeps: only trouble spends it.)
      if (s < 7.5 && mana - sp.mana < reserve) continue;
      if (s > bs) { bs = s; best = sp; }
    }
    // The staff is what it fights with between spells, and a spell comes as often as its mana allows: at once when it's in
    // trouble (a Mend, a Nova) or when they're frozen or drawn together (what follows a Nova or a Gravity Well), otherwise
    // every second or two with its mana full and every several with it low, and only when the moment suits one (a crowd,
    // something big or quick) or, once in a while, anyway.
    const urgent = best && bs >= 7.5 && this.t >= (this.urgentAt || 0);
    const combo = best && (c.frozen || c.pulled) && bs >= 3.4 && this.t >= this.comboAt;
    const suits = best && this.t >= this.spellAt && (bs >= 3.4 || (bs >= 2 && Math.random() < 0.3));
    if (!urgent && !combo && !suits) { staff(); return; }
    const mf = mana / m.maxMana;
    const key = best.key;
    if (GROUND.has(key)) this.pitch = Math.atan2(c.T.y - (m.y + 1.62), Math.max(1, c.d));
    // (The first Firebolt of a fight is gathered long, as you'd hold it on something that hasn't seen you: it bursts harder.)
    // (A channel is held a second or two, and never past the mana it has for it.)
    const hold = key === 'firebolt' ? (c.fresh && c.d > 5 ? 1.5 : c.d > 6 ? 0.95 : 0.5)
      : best.channel ? Math.max(0.45, Math.min(1.4 + Math.random() * 0.6, (mana - best.mana - Math.min(reserve, 20)) / (best.drain || 10) - 0.15)) : 0.16;
    if (this.cast(SP[key], hold)) {
      // (How soon the next: by how full its mana is.)
      this.spellAt = this.t + (mf > 0.7 ? 1.3 + Math.random() * 1.5 : mf > 0.4 ? 2.4 + Math.random() * 2.2 : 4 + Math.random() * 3);
      this.comboAt = this.t + 1.1;
      if (urgent) this.urgentAt = this.t + 3;
      this.castCool = best.channel ? 0.4 : 0.35 + Math.random() * 0.35 + (HEAVY.has(key) ? 0.8 : 0);
      if (key === 'blades') this.bladesT = this.t;
      if (key === 'nova' || key === 'zero') this.frozenT = this.t;
      if (key === 'well') this.pulledT = this.t;
      if ((HEAVY.has(key) || SKY.includes(key)) && (c.opener || c.finisher)) this.o.event?.(c.finisher ? 'finisher' : 'opener', { spell: best.name, who: this.foeName(c.T) });
      // (A flask is lobbed: its eyes go up by the arc it needs, and stay up till it's left the hand. motor().)
      if (key === 'plague') { this.lift = 0.5 * Math.asin(Math.min(1, 12 * c.d / (17 * 17))); this.liftT = this.t + 0.7; this.pitch += this.lift; }
    }
  }

  // Full Auto's rotation: the most damage for the time its hands are busy, from a mana pool that has to last. Each moment it
  // looks over what's ready on its bar and what each would do to the fight as it stands (castWorth), over the time it
  // holds the hands (HANDS, and a gather), and casts the best of it at once: no waiting for the moment's show.
  //   - Trouble first, as Cinematic: a Mend when it's low, a Nova or a Thunderclap when they're on it (USE scores 7.5+).
  //   - A spell with a cooldown is worth a fifth more while it's ready: held back, its clock isn't turning.
  //   - What has no cooldown (a Firebolt) fills between, and only from mana that isn't owed to a cooldown about to come
  //     ready: it never spends the mana the next Meteor needs.
  //   - A Firebolt is always gathered full: same mana, its whole bite (a short gather throws a fifth of it).
  //   - A channel pours at most a second: they're dear now.
  //   - Short of all that, the staff, which fights for nothing and wins back mana with every hit.
  fullShoot(snap, m, c) {
    const mana = this.purse(m.mana), sb = this.o.spellbar, bar = sb.loadout;
    const has = (k) => SP[k] !== undefined && bar.includes(SP[k]);
    const staff = () => {
      if (!c.aimed || this.staffCool > 0 || c.d > IN) return;
      if (m.hpf < 0.45 && has('mend') && mana < 31 && mana >= 24) return;
      if (this.t - this.tapAt < 0.4 && snap[H.SPELL_RIG] < 0.5) return;
      this.o.shared.input[INPUT.ATTACK] += 1;
      this.staffCool = 0.55 + Math.random() * 0.2;
      this.staffAt = this.t;
      this.o.log?.cast('staff');
    };
    if (this.castCool > 0) { staff(); return; }
    // (Owed: a Mend's worth when it's hurt, and the mana of a cooldown spell coming ready in the next two seconds and a half.)
    const owed = has('mend') && m.hpf < 0.6 ? 25 : 0, mf = mana / m.maxMana;
    let soon = 0;
    const defs = bar.map((i) => (i >= 0 ? sb.def?.(i) || SPELLS[i] : null));
    bar.forEach((i, k) => { const sp = defs[k]; if (sp?.cd && !UTILITY.has(i) && snap[H.COOL + i] > 0 && snap[H.COOL + i] < 2.5) soon = Math.max(soon, sp.mana); });
    let best = null, bs = 0, urgent = false;
    bar.forEach((i, k) => {
      const sp = defs[k], U = sp && USE[sp.key];
      if (!U || snap[H.COOL + i] > 0) return;
      const hold = sp.channel ? 1 : 0;
      const cost = sp.mana + (sp.channel ? (sp.drain || 10) * hold : 0);
      if (mana < cost) return;
      if (!SELF.has(sp.key) && !c.aimed) return;
      const use = U(c, this) || 0;
      if (!use) return;
      // (Trouble: it goes now, whatever it's worth in damage.)
      if (use >= 7.5) { if (!urgent || use > bs) { best = sp; bs = use; urgent = true; } return; }
      if (urgent) return;
      const worth = castWorth(sp, c);
      if (!worth) return;
      if (c.shield && BOLTS.has(sp.key)) return;
      // (What it can spend: a cooldown spell, all but the Mend's; a filler, only what no cooldown's about to want.)
      if (mana - cost < owed + (sp.cd ? 0 : soon)) return;
      // (Its time: the hands, and the time it takes to win its mana back, which is nothing with the pool full and more as
      // it empties: so a full pool spends for speed, Comet over a long-gathered Firebolt, and a low one for what each mana
      // buys, the Firebolt.)
      const time = HANDS[sp.rig] + (sp.gather || 0) + hold + cost / (EARN / Math.max(0.12, 1 - mf));
      let s = worth / time * (sp.cd ? 1.2 : 1);
      // (Dry is slow: a filler wants a fifth of the pool kept, and the staff earns it back.)
      if (!sp.cd && mana - cost < m.maxMana * 0.2) s *= 0.3;
      if (s > bs) { bs = s; best = sp; }
    });
    // (Not worth its hands: a shot of the staff does about this much a second, and brings mana back besides.)
    if (!best || (!urgent && bs < 15)) { staff(); return; }
    const key = best.key;
    if (GROUND.has(key)) this.pitch = Math.atan2(c.T.y - (m.y + 1.62), Math.max(1, c.d));
    const hold = best.gather ? best.gather + 0.3 : best.channel ? Math.max(0.45, Math.min(1, (mana - best.mana - owed) / (best.drain || 10) - 0.1)) : 0.16;
    if (this.cast(SP[key], hold)) {
      this.castCool = 0.15;
      if (key === 'blades') this.bladesT = this.t;
      if (key === 'nova' || key === 'zero') this.frozenT = this.t;
      if (key === 'well') this.pulledT = this.t;
      if (key === 'plague') { this.lift = 0.5 * Math.asin(Math.min(1, 12 * c.d / (17 * 17))); this.liftT = this.t + 0.7; this.pitch += this.lift; }
    }
  }

  // ---- what it can hit from here

  // A clean line to each of what it might shoot (the nav thread's `sight`: clear of walls, corners, pines and the rise of the
  // ground), asked a few times a second for the nearest of them. Until the answer's in, it holds its fire.
  watch(m, list) {
    if (this.sightBusy || !this.nav.ready || this.t - this.sightT < 0.1 || !list.length) return;
    const marks = list.length > 10 ? list.slice().sort((a, b) => a.d - b.d).slice(0, 10) : list;
    this.sightBusy = true; this.sightT = this.t;
    const ids = marks.map((f) => f.id), at = this.t;
    this.nav.ask('sight', { from: [m.x, m.y + 1.62, m.z], marks: marks.map((f) => [f.x, f.y + (f.h || 1), f.z]), hallOpen: this.o.game.hallUI?.hall?.state === 'open', doors: this.o.shared.input[INPUT.DOORS] }).then((r) => {
      this.sightBusy = false;
      if (r) r.forEach(([clear, step], i) => this.sightMap.set(ids[i], { clear: clear > 0, step, t: at }));
      if (this.sightMap.size > 80) for (const [k, v] of this.sightMap) if (this.t - v.t > 5) this.sightMap.delete(k);
    });
  }

  // What it last learned of its line to f: { clear, step } (step: how far to its right, or left if less than nothing, a clean
  // line opens), or null if it doesn't know yet.
  sees(f) { const v = this.sightMap.get(f.id); return v && this.t - v.t < 0.7 ? v : null; }
  // A clean shot at f, as far as it knows. (Before the nav thread's up, it shoots as it always did.)
  clean(f) { const v = this.sees(f); return v ? v.clear : !this.nav.ready; }

  // Nothing between it and something it means to have a word with or put a hand to (someone in the town, a chest, a thing on
  // the ground): no wall and no shut door, as the nav thread sees it from where it stands. The game's own E only measures
  // how far, so through a house's wall it would take a quest from the street. True, false, or null while it doesn't know.
  within(m, key, x, y, z) {
    const v = this.reachMap.get(key);
    if (!this.reachBusy && this.nav.ready && (!v || this.t - v.t > 0.2)) {
      this.reachBusy = true;
      const at = this.t;
      this.nav.ask('sight', { from: [m.x, m.y + 1.5, m.z], marks: [[x, y, z]], fat: 0.05, hallOpen: this.o.game.hallUI?.hall?.state === 'open', doors: this.o.shared.input[INPUT.DOORS] }).then((r) => {
        this.reachBusy = false;
        if (r) this.reachMap.set(key, { clear: r[0][0] > 0, t: at });
        if (this.reachMap.size > 40) for (const [k, q] of this.reachMap) if (this.t - q.t > 5) this.reachMap.delete(k);
      });
    }
    // (Before the nav thread's up there's no one to ask: as it always was.)
    return v && this.t - v.t < 0.8 ? v.clear : this.nav.ready ? null : true;
  }

  // The way to walk to (x, z) round whatever's between, a step at a time: by the nav thread's paths, the Warrens' and the
  // Test Dungeon's own fields. For getting a line on something behind a wall.
  wayTo(m, x, z) {
    if (inHall(m.x, m.z) && inHall(x, z)) { const o = (this.hallNav ||= new HallNav()).flow([0, 0], m.x, m.z, x, z, this.t); return [o[0], o[1]]; }
    if (inDungeon(m.x, m.z) && inDungeon(x, z)) { const o = caveStep(this, m, { x, z }); return [o[0], o[1]]; }
    const R = this.round;
    if (!R || (!R.pending && (this.t - R.t > 0.9 || dist(R.to[0], R.to[1], x, z) > 3))) {
      const ask = this.round = { t: this.t, to: [x, z], pts: R?.pts || null, pending: true };
      const grid = this.nav.inGrid(m.x, m.z, m.below) && this.nav.inGrid(x, z, m.below);
      this.nav.ask(grid ? 'path' : 'local', { from: [m.x, m.z], to: [x, z] }).then((pts) => { ask.pending = false; ask.pts = pts; ask.t = this.t; });
    }
    const pts = this.round?.pts;
    while (pts && pts.length > 1 && dist(m.x, m.z, pts[0][0], pts[0][1]) < 0.9) pts.shift();
    const [tx, tz] = pts?.length ? pts[0] : [x, z], L = dist(m.x, m.z, tx, tz) || 1;
    return [(tx - m.x) / L, (tz - m.z) / L];
  }

  // ---- the opening
  // (RIDE_FROM, RIDE_TO: where on the way down it rides its shield before the fight, below.)

  opening(snap, m) {
    const st = m.opening, t = m.openT;
    this.halt();
    this.wayRide = null;
    if (st !== OPENING.ESCORT) { this.wayS = this.herS = undefined; this.roadFought = false; }
    if (st === OPENING.WAKE) { this.say("Waking in Lisandra's cave."); return; }
    if (st === OPENING.COLLAPSE) { this.say('The cave comes down.'); return; }
    if (st === OPENING.NAME) {
      this.say('Answering to a name.');
      const f = document.getElementById('opening-name');
      if (f && !f.closest('[hidden]') && f.offsetParent !== null && (this.nameT = (this.nameT || 0) + 0.12) > 1.5) {
        this.nameT = 0;
        if (!f.value) f.value = NAME;
        f.form?.requestSubmit();
      }
      return;
    }
    if (st === OPENING.HERD && t < HERD_CONTROL) { this.say('Lisandra says your name.'); return; }
    if (st === OPENING.HERD || st === OPENING.LEAVE) {
      // Out of the cave the way she points, by the marks down its middle (never back in: she won't have it).
      // (And at a run once the tunnel starts coming down: she shouts for it.)
      const run = CUE_IDS[snap[H.OPENING_CUE] - 1] === 'run';
      this.say(run ? 'Out of the cave, at a run: it is coming down.' : 'Out of the cave.');
      const pts = RUN_OUT.concat([[CAVE_MOUTH[0] + CAVE_OUT[0] * 6, CAVE_MOUTH[1] + CAVE_OUT[1] * 6]]);
      let k = 0, best = 1e9;
      pts.forEach((p, i) => { const d = dist(p[0], p[1], m.x, m.z); if (d < best) { best = d; k = i; } });
      const to = pts[Math.min(pts.length - 1, best < 3 || k === 0 ? k + 1 : k)];
      this.steer(to[0] - m.x, to[1] - m.z, run);
      return;
    }
    if (st === OPENING.ESCORT) {
      const dead = this.foes(snap, m).filter((f) => f.hostile), foes = dead.filter((f) => f.d < 30);
      // (How many of the road's dead are still to be put down: src/sim/opening.js fight. Until it's none, it doesn't go on.)
      const fightOn = snap[H.OPENING_FIGHT] > 0;
      // (The road's fight: the dead in waves, their children, and at the end two necromancers out of the trees. It fights
      // them as it fights the woods' own: src/sim/opening.js fight has what comes and when.)
      const by = this.lisandra(snap);
      // (It stands its ground by her: backing off from fifty of them would take it clear to the town, and on this road it
      // can't die. Drawn off more than a few strides, it comes back to her before it fights on.)
      if (foes.length && by && dist(m.x, m.z, by.x, by.z) > 15) {
        this.face = null; this.steer(by.x - m.x, by.z - m.z, true); this.look = [by.x, by.z];
        this.say('Back to Lisandra: the fight is where she is.');
        return;
      }
      if (foes.length && this.combat(snap, m, foes)) { this.fighting = true; this.say(`Fighting the dead on the road (${foes.length}).`); return; }
      // The fight's still on and nothing's near: after whatever is left of them (a necromancer back in the trees, one that's
      // wandered), or by her until the next come up. Never on down the road with any of them still standing.
      if (fightOn) {
        const next = dead.reduce((a, f) => (!a || f.d < a.d ? f : a), null);
        this.face = null;
        if (next) { this.steer(next.x - m.x, next.z - m.z, next.d > 40); this.look = [next.x, next.z]; this.say('After the last of the dead on the road.'); return; }
        if (by && dist(m.x, m.z, by.x, by.z) > 5) this.steer(by.x - m.x, by.z - m.z, false);
        else if (by) this.face = Math.atan2(by.x - m.x, by.z - m.z);
        this.say('By Lisandra until every one of the dead is down.');
        return;
      }
      // She leads the way down (src/sim/opening.js): along her shelf, down her steps and the path, and then the road. It
      // follows a few strides behind her, at her pace. Stood still she stops and turns to it, and goes on when it's come
      // up to her: so it keeps coming until it's close.
      const her = this.lisandra(snap);
      if (!her) { this.say('Following Lisandra down to Bellmourn.'); return; }
      // (Where it is on the way: looked for near where it last was, so at the steps' turns it's never taken for being on
      // the flight below; found again from her if it's been knocked or carried well off it.)
      const hers = routeNear(her.x, her.z, this.herS ?? null, 80);
      this.herS = hers;
      let mine = routeNear(m.x, m.z, this.wayS ?? 0, 14);
      { const [px, pz] = routeAt(mine); if (dist(m.x, m.z, px, pz) > 12) mine = routeNear(m.x, m.z, hers, 80); }
      this.wayS = mine;
      const d = dist(m.x, m.z, her.x, her.z);
      const end = ROUTE.pts.at(-1);
      if (dist(m.x, m.z, end[0], end[1]) < 6 || (hers >= ROUTE.len - 0.5 && d < 6)) { this.face = Math.atan2(her.x - m.x, her.z - m.z); this.say('Bellmourn. Lisandra has her say.'); return; }
      // (Never aiming more than a few strides down the way, so it goes round each bend of it and not across the hill. And
      // never past a turn of the steps until it's stood on that landing: it walks to the turn, turns there, and goes on down
      // the next flight, instead of cutting across from one flight to the other.)
      const turn = cornerAhead(mine), reach = turn > 0.45 ? turn + 0.15 : Infinity;
      const [ax, az] = routeAt(Math.min(ROUTE.len, mine + reach, Math.max(mine + 3, Math.min(hers - 2.6, mine + 5))));
      // (Close behind her: it waits for her to go on. By the way, not as the crow flies: at a turn of the steps she's a
      // stride off across the corner and still a flight ahead, and stopping for that would leave them both stood there.)
      if (d < 2.4 && hers > mine && hers - mine < 3.2) { this.face = Math.atan2(her.x - m.x, her.z - m.z); this.say('Following Lisandra down to Bellmourn.'); return; }
      this.face = null;
      // Down the last hill on its shield, from the foot of her steps into the flat at the bottom and a little way along it,
      // and she gets on hers. (Her shelf and her steps are narrow and double back; it walks those. And it's off the board
      // again before the bare hillside, where the dead come up.) After the fight, down the long slope of the road the same.
      // (The fight's behind it once it's been in it; or, picking the walk up from a save, once she's well past where it was.)
      const fought = this.roadFought = this.roadFought || fightOn || (snap[H.OPENING_NEXT] > AMBUSH_AT + 30);
      // (board keeps it on while there's more than 40 m of `left`: so that runs out where it's to step off. And it only
      // runs for the board with a good stretch of the ride still ahead.)
      const rideLeft = fought ? ROUTE.len - mine : RIDE_TO + 40 - mine;
      const riding = mine > RIDE_FROM && rideLeft > 62;
      this.steer(ax - m.x, az - m.z, d > 9 || (riding && !m.surf));
      // (Its eyes on the road ahead: her, and the way she's going.)
      this.look = routeAt(Math.min(ROUTE.len, mine + Math.min(6, reach + 1)));
      const [rx, rz] = routeDir(mine);
      // (Ridden frame by frame, not thought by thought: Space has to stay down through the jump. See frame.)
      if (riding || m.surf) this.wayRide = { rx, rz, left: rideLeft, mine };
      if (!m.surf) this.say('Following Lisandra down to Bellmourn.');
    }
  }

  // Lisandra, whichever of her two forms is out: the last bodies in the snapshot (as src/ui/folk.js finds her).
  lisandra(snap) {
    const n = snap[H.NCHARS] | 0;
    for (let i = n - 1; i >= n - 2 && i >= 0; i--) {
      const o = CHARS_START + i * C_SIZE;
      if (snap[o + C.ACTIVE] > 0.5) return { x: snap[o + C.X], z: snap[o + C.Z] };
    }
    return null;
  }

  // ---- fighting

  // In the Warrens with a call to answer: where tactics() says to stand, the staff on what it says to hit. False when there's
  // nothing to answer, and combat() fights as ever (everything in there fightable with the party at its back).
  delve(snap, m, foes) {
    const t = tactics(this, m, foes);
    if (t.why === 'Out of the circle!' || t.wipe) this.o.log?.cast?.('dodge');
    if (!t.to) return false;
    // (Told not to take a step: stood where it is, hands down, till the fight says otherwise.)
    if (t.still) { this.halt(); this.face = t.target ? Math.atan2(t.target.x - m.x, t.target.z - m.z) : null; this.say(t.why); return true; }
    const d = dist(m.x, m.z, t.to[0], t.to[1]);
    const T = t.target;
    if (T) {
      const yaw = Math.atan2(T.x - m.x, T.z - m.z);
      this.face = yaw;
      this.pitch = Math.atan2(T.y + T.h - (m.y + 1.62), Math.max(1, T.d));
      this.aim = { x: T.x, z: T.z, y: T.y + T.h, w: 0 };
      // (Only down a clean line: the rock and the pillars stop what it throws as they stop the dragon's breath.)
      const live = foes.filter((f) => f.hostile && f.d < 34 && !f.slime && !f.tumbler);
      this.watch(m, live.includes(T) ? live : [T, ...live]);
      const aimed = this.clean(T) && Math.abs(wrap(yaw - this.o.input.yaw)) < Math.max(0.05, Math.atan2(0.9, T.d)) && Math.abs(this.pitch - this.o.input.pitch) < 0.15;
      if (d > 0.6) this.steer(t.to[0] - m.x, t.to[1] - m.z, t.run && d > 3, true); else this.halt();
      const near = live.reduce((a, b) => (a.d < b.d ? a : b), T);
      this.shoot(snap, m, { ...this.scene(m, live.length ? live : [T], T, near, live.filter((f) => f.d < 5.5).length, aimed, this.party(snap).filter((h) => !h.dead)), fresh: false, bladesUp: true });
    } else {
      this.face = null;
      if (d > 0.5) this.steer(t.to[0] - m.x, t.to[1] - m.z, t.run && d > 2); else this.halt();
    }
    this.say(t.why);
    return true;
  }

  combat(snap, m, foes) {
    // (With a party at its back, a tank among them, it stands up to a little more: what it could take two levels on. Not
    // the knights of Velscour or the Gravehart, which it goes after at its own level or not at all.)
    const lvl = m.lvl + (this.partyStrong(m) ? 2 : 0);
    // (Down the Warrens with a party: everything there is for fighting. src/ui/autowarrens.js.)
    // (And what the quest in hand has sent it to, a lair or a den and whatever stands there, its chief too, is for fighting
    // at the level the quest is wanted at: it used to run to a den it was told to empty, call its chief too big, run away
    // and come back. questGround.)
    const qg = this.questGround(m);
    const fightable = inDungeon(m.x, m.z) ? () => true : (k, l, hp, sl, f = null) => fightableAt(k, k === 0 || k === 3 ? m.lvl : l, hp, sl) || (!!qg && !!f && k >= TRIPO_KIND && dist(f.x, f.z, qg.x, qg.z) < qg.r);
    this.kiteCool -= 0.12; this.dodgeCool -= 0.12; this.reactT -= 0.12; this.rideCool -= 0.12;
    const noRide = () => { this.ride = null; this.rideHold = false; };
    // What it can't beat yet, coming for it: away over open ground, toward the town.
    const boss = this.job?.kind === 'boss';
    if (boss && this.blackKnight(snap) && dist(m.x, m.z, BLACK_POST[0], BLACK_POST[1]) < 60 && !foes.some((f) => f.id !== 0 && f.d < 8 && fightable(f.kind, lvl, f.maxHp, f.slime))) return false;
    const scary = foes.filter((f) => !fightable(f.kind, lvl, f.maxHp, f.slime, f) && !inLowLair(f, m.lvl) && f.kind !== 1 && f.hostile && f.d < 26 && !(boss && f.id === 0));
    if (scary.length) {
      const f = scary.reduce((a, b) => (a.d < b.d ? a : b));
      const [ex, ez] = this.escape(m, scary, true);
      noRide();
      this.face = null;
      this.steer(ex, ez, true);
      this.say(`Running from ${[0, 3, 4, 9, 10].includes(f.kind) ? this.foeName(f) : 'something too strong'}.`);
      return true;
    }
    const hunting = this.job?.kind === 'hunt' || this.job?.kind === 'grind' || this.job?.kind === 'fight';
    // On the way somewhere, only what's on it; hunting, whatever's about. (Once it's in a fight, it finishes it.)
    // (Down the Warrens, the whole room's fight is its fight: a boss across the cave is still its mark.)
    const reach = hunting || this.target || inDungeon(m.x, m.z) ? 30 : 14;
    // (And what's on one of its party, near by: their fight is its fight.)
    const company = this.party(snap).filter((h) => !h.dead);
    const ours = new Set(company.map((h) => h.idx));
    const live = foes.filter((f) => (fightable(f.kind, lvl, f.maxHp, f.slime, f) || inLowLair(f, m.lvl)) && !this.skipping(`foe:${f.id}`) && (f.hostile ? f.d < reach || (ours.has(f.after) && f.d < 30) : hunting && f.d < MAX_SIGHT && !inTown(f.x, f.z, 4) && !this.kept(m, f.x, f.z)));
    if (!live.length) { this.target = null; this.kite = null; noRide(); return false; }
    // (A fight begun: the first throw of it is its opener.)
    if (this.t - (this.foughtT ?? -99) > 3) this.fightSince = this.t;
    this.foughtT = this.t;
    // What it has a clean line to, of all of them (the answer's a moment behind: sees(), clean()).
    this.watch(m, live);
    const near = live.reduce((a, b) => (a.d < b.d ? a : b)), dn = near.d;
    const close = live.filter((f) => f.d < 5.5).length;
    // On the shield: a ride it began (below), or a fight met while it was riding down a hill, which it rides on through
    // with its staff on them rather than stepping off among them.
    if (!this.ride && m.surf && Math.hypot(m.vx, m.vz) > 5 && this.t - (this.rodeT ?? -9) > 3) { this.ride = { x: m.vx, z: m.vz, t: 0, phase: 'ride', clear: true, why: 'past' }; this.rideHold = true; this.o.log?.cast?.('surf'); }
    if (this.ride && this.riding(snap, m, live, near, close)) return true;
    // Low, and still in it: off toward the town, a Mend when there's room for one. From something slow a few strides off it
    // backs away with its staff still on it, shooting as it goes; anything quicker or closer, it turns and runs from.
    let retreat = null;
    // (Bold: it stays in lower, and lower still with its mark nearly down: the kill first.)
    const mark = this.target && live.find((f) => f.id === this.target.id);
    const finishing = this.bold && mark && mark.maxHp > 1 && mark.hp < mark.maxHp * 0.3 && live.length <= 2;
    if (m.hpf < (this.bold ? (finishing ? 0.1 : 0.18) : 0.28) && dn < 10) {
      if (m.mana >= 25 && this.known(SP.mend) && dn > 7 && this.castCool <= 0 && this.cast(SP.mend, 0.35)) this.castCool = 1.2;
      const [ex, ez] = this.escape(m, live, true);
      if (Math.hypot(near.vx || 0, near.vz || 0) < 3.5 && dn > 3.5 && close < 2) retreat = [ex, ez];
      else {
        this.face = null;
        this.kite = null;
        this.steer(ex, ez, true);
        this.say('Hurt: falling back.');
        return true;
      }
    }
    // A blade flashing before it falls, or something right on it: the shield, if there's one on its arm and no skull in that
    // hand; else a sidestep. The guard takes each blow out of its breath and breaks when that's gone (src/sim/player.js
    // blockBlow), so it's raised only with breath for the shove and a blow or two, and comes down before the breath does.
    const flash = live.find((f) => f.glint > 0.08 && f.glint < 0.6 && f.d < 4.5);
    const board = !!this.o.pack.slots.off && !this.o.pack.slots.skull;
    if (this.guardT > 0) {
      // Behind the shield: facing what's on it, giving ground a little, till it comes down again.
      this.guardT -= 0.12; this.guardFor += 0.12;
      // (Down again when its time's up, before its breath is, or at once if it never came up: something else had its hands.)
      const failed = this.guardFor > 0.3 && snap[H.SHIELD_UP] < 0.3;
      if (this.guardT <= 0 || m.stam < 18 || !board || failed) { this.guardT = 0; this.auto.block = false; this.guardCool = failed ? 0.7 : 3.5 + Math.random() * 2.5; this.kiteCool = 0; }
      const t = flash || near;
      this.face = Math.atan2(t.x - m.x, t.z - m.z);
      this.steer(m.x - t.x, m.z - t.z, false, true);
      this.say(`Behind the shield: ${this.foeName(t)}.`);
      return true;
    }
    this.guardCool -= 0.12;
    // (The shove on the way up throws back and sets reeling everything in front of it, seven metres deep: so it comes up
    // for what's closing on it, a few strides off, as well as for what's already at its elbow.)
    const body = near.hostile && !near.slime && !near.tumbler;
    const pressed = body && (dn < 4.2 || (close >= 2 && dn < 5.5));
    // (And only with its hands free: the shield won't come up through a spell that's still leaving them.)
    if (board && this.guardCool <= 0 && m.stam >= 50 && !this.auto.cast && !this.slotHeld && snap[H.CAST_HELD] < 0.5 && snap[H.SPELL_RIG] < 0.5 && ((flash && Math.random() < 0.75) || pressed)) {
      // Square on to it first (the shove goes where it's looking, and the board covers only its front), then up with a shove.
      const t = flash || near, to = Math.atan2(t.x - m.x, t.z - m.z);
      this.face = to;
      this.steer(m.x - t.x, m.z - t.z, false, true);
      if (Math.abs(wrap(to - this.o.input.yaw)) < 0.45) {
        // (The right button: held before the press is seen, as the mouse has it, or the shield would drop the moment it rose.)
        this.auto.block = true;
        this.o.shared.input[INPUT.BLOCK] = 1;
        this.o.shared.input[INPUT.WIDE] += 1;
        this.guardT = 0.4 + Math.random() * 0.35; this.guardFor = 0;
        this.o.log?.cast('shield');
        this.say(`Behind the shield: ${this.foeName(t)}.`);
      } else this.say(`Turning to meet ${this.foeName(t)} with the shield.`);
      return true;
    }
    if (flash && this.dodgeCool <= 0 && Math.random() < 0.7) { this.dodgeCool = 1.4; this.dodgeSide = Math.random() < 0.5 ? -1 : 1; this.dodgeDir = null; this.o.shared.input[INPUT.DODGE] += 1; }
    // A tumbler rolling straight at it: it can't turn quickly, so a step aside and it goes by (src/sim/tumblers.js).
    const roll = live.find((f) => f.tumbler && f.d < 9 && ((f.vx || 0) * (m.x - f.x) + (f.vz || 0) * (m.z - f.z)) / (f.d || 1) > 3.5);
    if (roll && this.dodgeCool <= 0) {
      const v = Math.hypot(roll.vx, roll.vz) || 1, px = -roll.vz / v, pz = roll.vx / v, side = px * (m.x - roll.x) + pz * (m.z - roll.z) >= 0 ? 1 : -1;
      this.dodgeDir = [px * side, pz * side]; this.dodgeCool = 1.4;
      if (roll.d < 4) this.o.shared.input[INPUT.DODGE] += 1;
    }
    // Kiting: something's on it, so it gives ground toward open country. Mostly it backs away facing them, its staff still on
    // them and shooting as it goes (backwards is a walk, as it is for you). With something quick on its heels, a crowd at its
    // elbows, or its back to a wall, it gets clear instead: on its shield when the ground allows (a few strides' run, a jump,
    // and it slides off with its staff still on them: riding()), else it turns and runs a few strides, then turns back.
    let K = this.kite;
    if (K) {
      K.t -= 0.12;
      // (Backing into something: round, and a run for it.)
      if (K.back && this.backedUp > 0.5) { const [ex, ez] = this.escape(m, live); K = this.kite = { x: ex, z: ez, t: 1 + Math.random() * 0.5, back: false }; this.backedUp = 0; }
      // (Over once it has the room it fights from: further, and it would only have to come back in to cast. REACH.)
      if (K.t <= 0 || dn > (K.back ? IN - 2 : IN - 0.5)) { if (!K.back) this.reactT = 0.3; this.kite = K = null; }
      else if (K.back) { const [ex, ez] = this.escape(m, live); K.x = ex; K.z = ez; }
      else {
        this.face = Math.atan2(K.x, K.z);
        this.steer(K.x, K.z, true);
        // (A Blink, if it's on its bar: gone from among them, fourteen paces on the way it's running.)
        if (!K.blinked && SP.blink !== undefined && this.o.spellbar.loadout.includes(SP.blink) && (close >= 2 || dn < 3) && Math.abs(wrap(this.face - this.o.input.yaw)) < 0.35 && this.cast(SP.blink, 0.3)) K.blinked = true;
        this.say(`Kiting ${live.length > 1 ? `${live.length} foes` : this.foeName(near)}.`);
        return true;
      }
    }
    if (!K && !retreat && (dn < 3 || (close >= 2 && dn < 4.5) || this.backedUp > 0.8) && this.kiteCool <= 0) {
      // Frozen first, if it's a crowd.
      // (The first it knows and has ready of a Frost Nova, a Thunderclap, Turn the Dead.)
      const panic = close >= 3 && !this.auto.cast ? PANIC.map((k) => SP[k]).find((i) => this.known(i) && !(snap[H.COOL + i] > 0)) : undefined;
      if (panic !== undefined && this.cast(panic, 0.3)) { this.castCool = 0.5; if (panic === SP.nova) this.frozenT = this.t; }
      const [ex, ez] = this.escape(m, live);
      // (It backs off at a walk, a little slower while it shoots: what's quicker than that and already at its heels, it can't
      // back away from. Nor from what's right on it, a crowd all round, or a wall behind.)
      const quick = Math.hypot(near.vx || 0, near.vz || 0) > 4.6;
      const turn = (quick && dn < 2.5) || dn < 1.4 || close >= 4 || this.backedUp > 0.8;
      // (Clear of them on the shield, when there's the ground and the breath for it: most times, not every time.)
      if ((turn || close >= 2) && this.canRide(m) && this.rideWay(m, ex, ez) && Math.random() < 0.85) { this.startRide(m, ex, ez, 'away'); this.backedUp = 0; return true; }
      K = this.kite = { x: ex, z: ez, t: turn ? 1.1 + Math.random() * 0.7 : 1.3 + Math.random() * 0.9, back: !turn };
      this.kiteCool = turn ? 2.6 : 1.6; this.backedUp = 0;
      if (turn) return true;
    }
    if (K?.back && !retreat) retreat = [K.x, K.z];
    // Its mark: with a party, what's on the healer or the others, then what the tank's holding (helpPick); else what's
    // coming for it first, then the nearest, and sooner one it has a clean line to or can reach, one nearly down, and the one it's
    // already on (it doesn't flit between them). A new one takes a moment to settle on.
    const help = this.helpPick(live, m);
    const want = (f) => { const v = this.sees(f); return f.d - (f.hostile ? 6 : 0) + (v && !v.clear ? 9 : 0) + (f.d > IN ? 4 : 0) - (f.id === this.target?.id ? 2.5 : 0) - (f.hostile && f.maxHp > 1 && f.hp < f.maxHp * 0.3 ? 3 : 0); };
    const pick = help?.T || live.reduce((a, b) => (want(a) <= want(b) ? a : b));
    if (this.target?.id !== pick.id) { this.target = pick; this.reactT = 0.2 + Math.random() * 0.25; } else Object.assign(this.target, pick);
    const T = this.target, d = T.d;
    // With a tank of its own: it lets him get up with it before it starts on something that hasn't seen them, so what
    // comes, comes onto him. (A few seconds at most.)
    const tank = company.find((h) => h.role === 'tank' && h.hpf > 0.3);
    if (!T.hostile && tank && dist(tank.x, tank.z, m.x, m.z) > 9 && d > 10 && (this.pullWait += 0.12) < 4) {
      this.face = Math.atan2(T.x - m.x, T.z - m.z);
      this.halt();
      this.say('Waiting for the tank before starting on them.');
      return true;
    }
    if (T.hostile) this.pullWait = 0;
    // Nothing it throws is landing (behind a wall, across a gap): leave that one be for a while.
    // (Counted afresh for one it hasn't been at for a moment, and for another body in the same place in the snapshot: a
    // record was kept by id for ever, so the next thing to stand up with a dead one's id, at full life, was "not being
    // hurt" from the moment it was looked at, and was left alone for 45 s while it came on.)
    let tk = this.engage.get(T.id);
    if (!tk || this.t - tk.last > 2 || T.hp > tk.best + 1) tk = { since: this.t, best: T.hp, last: this.t };
    tk.last = this.t;
    if (T.hp < tk.best - 0.5) { tk.best = T.hp; tk.since = this.t; }
    this.engage.set(T.id, tk);
    if (this.t - tk.since > (T.slime || T.tumbler ? 20 : 12)) { this.giveUp(`foe:${T.id}`, 45); this.engage.delete(T.id); this.target = null; }
    // Where it'll be when the bolt gets there, and a hand that isn't perfect: a little off, more so on something quick. (The
    // look follows that point from where it stands each frame, not from where it stood when it last thought: motor().)
    const tt = d / 34, ax = T.x + (T.vx || 0) * tt, az = T.z + (T.vz || 0) * tt;
    if ((this.wobbleT -= 0.12) <= 0) { this.wobbleT = 0.5 + Math.random() * 0.5; this.wobble = (Math.random() - 0.5) * (0.02 + Math.hypot(T.vx || 0, T.vz || 0) * 0.006); }
    const yaw = Math.atan2(ax - m.x, az - m.z) + this.wobble;
    this.face = yaw;
    this.pitch = Math.atan2(T.y + T.h - (m.y + 1.62), Math.max(1, d));
    this.aim = { x: ax, z: az, y: T.y + T.h, w: this.wobble };
    // A clean line to it, or none (a wall, a corner, a pine, a rise in the ground between): it never throws through one.
    const sight = this.sees(T), blocked = !!sight && !sight.clear;
    const aimed = this.reactT <= 0 && this.clean(T) && Math.abs(wrap(yaw - this.o.input.yaw)) < Math.max(0.035, Math.atan2(0.8, d)) && Math.abs(this.pitch - this.o.input.pitch) < 0.12;
    // Footwork: back off what's close while it shoots, close in on what's further than it reaches, step side to side between.
    let mx = 0, mz = 0, run = false;
    const fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1), bx = (m.x - near.x) / (dn || 1), bz = (m.z - near.z) / (dn || 1);
    if ((this.strafeT -= 0.12) <= 0) { this.strafeT = 1.2 + Math.random() * 2.2; this.strafe = Math.random() < 0.75 ? -this.strafe : this.strafe; }
    // Giving ground (kiting, or hurt): straight back along the way it's chosen, its eyes and its staff on its mark.
    if (retreat) { [mx, mz] = retreat; mx += -fz * this.strafe * 0.15; mz += fx * this.strafe * 0.15; }
    else if (blocked) {
      // No clean line: out to where there is one. A step or two to the side if that opens it (round the corner, out from
      // behind the pine), else the way it would walk to it; still backing off anything that's close.
      if (this.slotHeld || this.auto.cast) this.letGo();
      if (sight.step) { const sg = Math.sign(sight.step); mx = -fz * sg; mz = fx * sg; }
      else [mx, mz] = this.wayTo(m, T.x, T.z);
      if (dn < 5) { mx += bx * 0.8; mz += bz * 0.8; }
    } else {
      // (Across them on the shield, now and then: the side the ground falls away on.)
      if (!K && dn > 6 && d > 6 && d < IN + 4 && m.hpf > 0.5 && this.t - this.fightSince > 3 && T.hostile && this.canRide(m) && Math.random() < 0.11) {
        const h0 = terrainHeight(m.x, m.z), drop = (sg) => h0 - terrainHeight(m.x - fz * sg * 10, m.z + fx * sg * 10);
        const sg = drop(1) >= drop(-1) ? 1 : -1, wx = -fz * sg * 0.95 - fx * 0.3, wz = fx * sg * 0.95 - fz * 0.3, L = Math.hypot(wx, wz);
        if (this.rideWay(m, wx / L, wz / L)) { this.startRide(m, wx / L, wz / L, 'across'); return true; }
        this.rideCool = 3;
      }
      // (Well out of its reach, and nothing at it: in at a run, straight, as a player does; there's nothing to cast till it's
      // there. Not on its last breath: the shield wants that. Walking in, side to side as it went, it was seconds getting
      // from thirty paces to where its spells reach, giving whatever had seen it free blows all the way.)
      run = d > IN + 3 && dn > 6 && !K && m.stam > 55;
      if (dn < 4.5) { mx = bx; mz = bz; } else if (d > IN - 1.5) { mx = fx; mz = fz; }
      const side = run ? 0.12 : 0.6;
      mx += -fz * this.strafe * side; mz += fx * this.strafe * side;
    }
    if (this.dodgeCool > 1.1) { if (this.dodgeDir) [mx, mz] = this.dodgeDir; else { mx = -fz * this.dodgeSide; mz = fx * this.dodgeSide; } }
    this.steer(mx, mz, run, true);
    // (Backing into something: noted, and the next close call turns into a run instead.)
    this.backedUp = dn < 4.5 && Math.hypot(m.vx, m.vz) < 1 ? (this.backedUp || 0) + 0.12 : 0;
    this.shoot(snap, m, this.scene(m, live, T, near, close, aimed, company));
    const who = live.length > 1 ? `${live.length} foes` : this.foeName(T);
    // (For whoever's watching: what it's up against. src/ui/autoshow.js.)
    this.scene0 = { t: this.t, n: live.length, who: this.foeName(T), big: T.maxHp > 150, left: T.maxHp > 1 ? T.hp / T.maxHp : 1, early: this.bold && !inDungeon(m.x, m.z) && !fightableAt(T.kind, m.own + (this.partyStrong(m) ? 2 : 0), T.maxHp, T.slime) };
    this.say(retreat ? `Backing away from ${who}, shooting${this.tankNear(m) ? ', to the tank' : ''}.` : blocked ? `No clean line to ${this.foeName(T)}: stepping out for the shot.` : help && T.id === help.T.id ? help.why : `Fighting ${who}.`);
    return true;
  }

  // The fight as it stands, for shoot() and USE: its mark and the nearest, how many and how they stand, what it has going
  // (ice on them, a well drawing them in), and who's with it.
  scene(m, live, T, near, close, aimed, company = []) {
    const d = T.d, fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1);
    const around = live.filter((f) => dist(f.x, f.z, T.x, T.z) < 5.5).length;
    // (What's lined up behind its mark, for what goes through.)
    const inLine = live.filter((f) => { const a = (f.x - m.x) * fx + (f.z - m.z) * fz; return a > 0 && a < REACH + 1 && Math.abs((f.x - m.x) * fz - (f.z - m.z) * fx) < 1.5; }).length;
    const sp = Math.hypot(T.vx || 0, T.vz || 0), coming = ((T.vx || 0) * -fx + (T.vz || 0) * -fz) > 1;
    // (What its tank is holding stands still for it, the rest of them about him.)
    const tank = company.find((h) => h.role === 'tank'), held = !!tank && tank.foe === T.id && dist(tank.x, tank.z, T.x, T.z) < 5;
    const pull = this.t - this.pulledT;
    return { T, d, dn: near.d, n: live.length, close, near: live.filter((f) => f.d < 9).length, around, aimed, hpf: m.hpf, left: T.hp, fast: sp > 4 && !held, still: sp < 1.5 || held, big: T.maxHp > 150, inLine, coming,
      bladesUp: this.t - (this.bladesT ?? -99) < 20, shield: false, fresh: this.t - this.fightSince < 2.5,
      // (The show of it: its heaviest for the first throw at a crowd or something big, and for the last of something big.)
      opener: this.t - this.fightSince < 3.5 && (T.maxHp > 150 || around >= 3), finisher: T.maxHp > 150 && T.hp < T.maxHp * 0.22 && T.hp > 12,
      frozen: this.t - this.frozenT < 4.2 && d < 13, pulled: pull > 1 && pull < 4.2, held, party: company.length > 0, healer: company.some((h) => h.role === 'heal') };
  }

  // ---- the shield under its feet, in a fight

  // Whether a ride's on: a shield to stand on (on its arm or not: it comes off for this), open ground under the sky, breath
  // for the run and the jump, and not too soon after the last.
  canRide(m) {
    // (Not on the walk down with Lisandra: it keeps by her there.)
    return this.allow('aiSurf') && this.rideCool <= 0 && !!this.o.pack.slots.off && !m.below && !m.town && m.ground && !m.surf && m.stam >= 46 && !(m.opening > 0 && m.opening < OPENING.ARRIVED)
      && !inDungeon(m.x, m.z) && !inHall(m.x, m.z) && !inChurch(m.x, m.y + 1, m.z) && floorAt(m.x, m.z) === null;
  }

  // A way to ride: not uphill (the shield only carries what it's given, and what the slope adds), not into ground it keeps
  // clear of, not into the town.
  rideWay(m, dx, dz) {
    const h0 = terrainHeight(m.x, m.z);
    if (terrainHeight(m.x + dx * 8, m.z + dz * 8) - h0 > 0.5 || terrainHeight(m.x + dx * 16, m.z + dz * 16) - h0 > 1) return false;
    return !this.kept(m, m.x + dx * 16, m.z + dz * 16) && !inTown(m.x + dx * 16, m.z + dz * 16, 6);
  }

  startRide(m, dx, dz, why) {
    const R = this.ride = { x: dx, z: dz, t: 0, phase: 'run', clear: null, why };
    this.kite = null;
    // (Only if the way's open: the nav thread's word on it comes during the run-up.)
    this.nav.ask('probe', { x: m.x, z: m.z, y: m.y + 0.2, hx: dx, hz: dz, look: 8 }).then((r) => {
      if (this.ride !== R) return;
      // (Eight metres clear, the way it wanted or near enough to it: room for the run and the jump. It carves round what
      // comes after: riding().)
      if (r && r[2] >= 7.6 && r[0] * dx + r[1] * dz > 0.45 && this.rideWay(m, r[0], r[1])) { R.x = r[0]; R.z = r[1]; R.clear = true; } else R.clear = false;
    });
  }

  // A ride on the shield in the middle of a fight, as a player does it: a few strides' run, a jump with Space held, and it
  // slides clear of them (or across them) faster than it can back away, looking where it likes: so its staff and its spells
  // stay on them all the way, and it carves with the move keys round its mark. Off again as it slows, at something in the
  // way, or after a few seconds. True while it's at it. R: { x, z: the way, t, phase: 'run' | 'air' | 'ride', why }.
  riding(snap, m, live, near, close) {
    const R = this.ride, sp = Math.hypot(m.vx, m.vz);
    R.t += 0.12;
    const end = (cool) => { this.ride = null; this.rideHold = false; this.rodeT = this.t; this.rideCool = cool ?? 9 + Math.random() * 9; this.kiteCool = Math.max(this.kiteCool, 0.8); this.reactT = 0.15; return false; };
    if (R.phase === 'run') {
      // The run-up: straight along the way, at a run; the jump once it's quick enough and the way's known to be clear.
      if (R.t > 1.4 || R.clear === false || m.stam < 12) return end(5);
      this.face = Math.atan2(R.x, R.z);
      this.steer(R.x, R.z, true);
      this.say(R.why === 'away' ? 'Getting clear of them: a run for the shield.' : 'A run for the shield, to ride across them.');
      if (R.clear && R.t >= 0.36 && sp > 6 && m.ground && Math.abs(wrap(this.face - this.o.input.yaw)) < 0.45) {
        this.o.shared.input[INPUT.JUMP] += 1;
        this.rideHold = true; this.auto.jumpHeld = true;
        R.phase = 'air'; R.t = 0;
        this.o.log?.cast?.('surf');
      }
      return true;
    }
    if (R.phase === 'air') { if (m.surf) R.phase = 'ride'; else if (R.t > 0.8) return end(6); }
    else if (!m.surf || sp < 3.4 || R.t > 5 || R.wall) return end();
    // Its mark: the one it was on, if it's still there; and its eyes on it, wherever the shield is taking it.
    const T = (this.target && live.find((f) => f.id === this.target.id)) || near;
    this.target = T;
    const d = T.d, tt = d / 34, ax = T.x + (T.vx || 0) * tt, az = T.z + (T.vz || 0) * tt;
    const yaw = Math.atan2(ax - m.x, az - m.z);
    this.face = yaw;
    this.pitch = Math.atan2(T.y + T.h - (m.y + 1.62), Math.max(1, d));
    this.aim = { x: ax, z: az, y: T.y + T.h, w: 0 };
    const aimed = this.clean(T) && Math.abs(wrap(yaw - this.o.input.yaw)) < Math.max(0.05, Math.atan2(0.9, d)) && Math.abs(this.pitch - this.o.input.pitch) < 0.14;
    // (Carried well past where anything it casts gets to: off, and back in on foot. Clear of a crowd it goes a little further.)
    if (R.phase === 'ride' && R.t > 1.2 && d > REACH + (R.why === 'away' ? 6 : 4)) return end();
    // Carving: along the way it's going (never against it: that's the heel down), bending round its mark, in toward it when
    // it's getting far and out when it's close; and round whatever stands ahead, or off the shield if that can't be done.
    const vx = sp > 1 ? m.vx / sp : R.x, vz = sp > 1 ? m.vz / sp : R.z;
    if ((R.probeT = (R.probeT || 0) - 0.12) <= 0) {
      R.probeT = 0.24;
      this.nav.ask('probe', { x: m.x, z: m.z, y: m.y + 0.2, hx: vx, hz: vz, look: 5.5 }).then((r) => {
        if (this.ride !== R || !r) return;
        // (The nearest way to its own that's clear for a few metres: carved toward. None within a quarter turn: off.)
        const along = r[0] * vx + r[1] * vz;
        R.bend = along < 0.995 ? [r[0], r[1]] : null;
        if (r[2] < 3 || along < 0.3) R.wall = true;
      });
    }
    let wx = vx, wz = vz;
    if (R.bend) [wx, wz] = R.bend;
    else {
      const fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1), side = vx * -fz + vz * fx >= 0 ? 1 : -1, k = d < 4.5 ? -0.5 : d > IN - 1 ? 0.5 : 0;
      wx = vx - fz * side * 0.35 + fx * k; wz = vz + fx * side * 0.35 + fz * k;
    }
    this.steer(wx, wz, false, true);
    this.shoot(snap, m, this.scene(m, live, T, near, close, aimed, this.party(snap).filter((h) => !h.dead)));
    const who = live.length > 1 ? `${live.length} foes` : this.foeName(T);
    this.say(`Riding the shield ${R.why === 'away' ? 'clear of' : R.why === 'across' ? 'across' : 'past'} ${who}, shooting (${sp.toFixed(0)} m/s).`);
    return true;
  }

  // Which way to get away: the open side, away from all of them (toward the town, if home), never into ground it keeps clear of;
  // then the nav thread's word on what's clear that way (a wall, a pine), taken up as soon as it comes. Held a moment, so it
  // doesn't dither.
  escape(m, from, home = false) {
    if (this.esc && this.t - this.esc.t < 0.4) return this.esc.dir;
    let best = [0, 1], bs = -Infinity;
    // (Kiting with its tank about: back toward him, so what's on it comes into his reach and he takes it.)
    const tank = home ? null : this.tankNear(m);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, dx = Math.sin(a), dz = Math.cos(a), px = m.x + dx * 6, pz = m.z + dz * 6;
      let s = 0;
      for (const f of from) s += Math.min(10, dist(px, pz, f.x, f.z));
      if (home && !m.below && !inHall(m.x, m.z)) s += (dist(m.x, m.z, 0, 0) - dist(px, pz, 0, 0)) * 0.6;
      if (tank) s += (dist(m.x, m.z, tank.x, tank.z) - Math.max(2.5, dist(px, pz, tank.x, tank.z))) * 0.7;
      if (this.kept(m, px, pz)) s -= 40;
      if (this.esc) s += (dx * this.esc.dir[0] + dz * this.esc.dir[1]) * 2;
      if (s > bs) { bs = s; best = [dx, dz]; }
    }
    const esc = this.esc = { t: this.t, dir: best };
    this.nav.ask('probe', { x: m.x, z: m.z, y: m.y + 0.2, hx: best[0], hz: best[1], look: 4 }).then((r) => {
      if (!r || this.esc !== esc) return;
      esc.dir = [r[0], r[1]];
      if (this.kite) { this.kite.x = r[0]; this.kite.z = r[1]; }
    });
    return best;
  }

  foeName(f) {
    if (f.slime) return 'a jelly';
    if (f.kind === 5) return f.maxHp > 150 ? 'a champion of the dead' : 'one of the risen';
    if (f.kind >= TRIPO_KIND) {
      // (By its own name if it has one, a boss's; else by what the delve or the lair it's in calls its kind: the Redoubt's
      // toll-clerks, the Sill's hanged debtors. src/core/delve-redoubt.js names, src/core/tripo-monsters.js LAIRS.)
      const T = this.o.renderer?.tripo, wild = f.model && T?.wildName?.(f.model), own = f.model && T?.ownName?.(f.model);
      if (wild) return `a ${wild.toLowerCase()}`;
      if (own) return own.toLowerCase().replace(/(^|[\s-])\w/g, (c) => c.toUpperCase());
      const key = GROUP_KEYS[f.kind - TRIPO_KIND], lair = LAIRS.find((l) => l.names && dist(f.x, f.z, l.x, l.z) < l.r + 30);
      // (A lair's names go by the kind's own name, "The Possessed"; a delve's by its key. And "the" off: "a the possessed".)
      const called = delveOf(f.x, f.z)?.names?.[key] || lair?.names[key] || lair?.names[GROUPS[key]?.name];
      return `a ${(called || GROUPS[key]?.name || 'monster').toLowerCase().replace(/^the /, '')}`;
    }
    return ['a knight of Velscour', 'a knight', 'a great crab', 'the Gravehart', 'the Bone Hydra', 'one of the risen', 'an ogre', '', '', 'the werewolf', 'the Abyssal Mouth'][f.kind] || 'something';
  }

  // ---- loot and chests

  loot(m, foes) {
    if (foes.some((f) => f.hostile && f.d < 18)) return false;
    const g = this.o.game, pack = this.o.pack;
    // (On the way somewhere: only what's close by.)
    const hunting = this.job?.kind === 'hunt';
    let best = null, bd = hunting ? 22 : 10;
    for (const d of g.drops.list) {
      if (Math.abs(d.y - m.y) > 3 || this.skipping(d) || this.kept(m, d.x, d.z)) continue;
      if (!d.auto && !d.coins && (!this.allow('aiLoot') || !this.roomFor(d.item))) continue;
      const k = dist(m.x, m.z, d.x, d.z);
      if (k < bd) { bd = k; best = d; }
    }
    if (best) {
      if (!this.lootT || this.lootFor !== best) { this.lootFor = best; this.lootT = this.t; }
      if (this.t - this.lootT > 9) { this.giveUp(best, 120); return false; }
      this.say(best.auto || best.coins ? 'Picking up what fell.' : 'Taking up something worth having.');
      // (Never through a wall: round to it first.)
      const reach = !best.auto && !best.coins && bd < 1.7 ? this.within(m, best, best.x, best.y + 0.3, best.z) : false;
      if (reach === null) { this.halt(); return true; }
      if (reach) {
        // E, as you'd press it; or, a step off from it, the same thing E does: a scroll read, the rest into the pack.
        if (g.nearDrop === best) g.takeNearest();
        else if (best.item.type === 'spell') {
          if (!this.o.spellbar.learn(best.item.spell)) pack.gold += 40;
          g.drops.take(best); g.onTaken?.();
        } else if (pack.add(best.item)) { g.drops.take(best); g.onTaken?.(); } else this.giveUp(best, 600);
        return true;
      }
      // (Coin, orbs and stuff come to hand within two metres; gear wants E within that.)
      this.goTo(best.x, best.z, best.auto || best.coins ? 1.1 : bd < 1.7 ? 0.5 : 1.2, false, false, m.below, best.auto || best.coins ? null : best.y + 0.3);
      if (this.noWay) { this.giveUp(best, 240); this.noWay = null; }
      return true;
    }
    // A chest near by that it hasn't opened: every one, out in the land and in the town's houses (in at the door, and what's
    // in it picked up as it spills). On its own floor only: it doesn't take stairs.
    if (!this.allow('aiChests')) return false;
    let ch = null, cd = hunting ? 40 : m.town ? TOWN_CHEST : 14;
    // (The one it's already going for, it keeps going for: the way to a chest in a house starts by walking away from it, round
    // to the door, and with two about the same way off it would turn from one to the other and back for ever.)
    let cur = this.chestFor;
    // (In the town, one at a time and not one after another: the next it passes, a while after. It used to go from house to
    // house for all fifteen before it took a quest.)
    if (cur?.open) { if (m.town) this.townChestAt = this.t; cur = this.chestFor = null; }
    if (m.town && !cur && this.t - (this.townChestAt ?? -999) < TOWN_CHEST_GAP) return false;
    if (cur && !cur.open && Math.abs(cur.y - m.y) <= 2.5 && !this.skipping(cur) && this.t - (this.chestSeen ?? -9) < 1 && dist(m.x, m.z, cur.x, cur.z) < 34) { ch = cur; cd = dist(m.x, m.z, cur.x, cur.z); }
    else for (const c of g.chests.list) {
      if (c.open || Math.abs(c.y - m.y) > 2.5 || this.skipping(c) || this.kept(m, c.x, c.z)) continue;
      const k = dist(m.x, m.z, c.x, c.z);
      if (k < cd) { cd = k; ch = c; }
    }
    if (ch) this.chestSeen = this.t;
    if (ch) {
      if (!this.chestT || this.chestFor !== ch) { this.chestFor = ch; this.chestT = this.t; }
      // (Somewhere it can't get to, or can't get a hand to: left, for a good while.)
      if (this.t - this.chestT > (m.town ? 45 : 25)) { this.giveUp(ch, 600); return false; }
      this.say('Opening a chest.');
      if (cd < 2) {
        // (Never through a wall: a chest against the far side of one is walked round to, by the door.)
        const reach = this.within(m, ch, ch.x, ch.y + 0.5, ch.z);
        if (reach !== false) {
          this.face = Math.atan2(ch.x - m.x, ch.z - m.z);
          this.halt();
          if (reach && g.nearChest === ch) g.takeNearest();
          else if (reach && cd < 1.6 && Math.abs(wrap(this.face - this.o.input.yaw)) < 0.3) { g.chests.open(ch); }
          return true;
        }
      }
      this.goTo(ch.x, ch.z, cd < 2 ? 0.5 : 1.2, cd > 5, false, m.below, ch.y + 0.5);
      if (this.noWay) { this.giveUp(ch, 600); this.noWay = null; }
      return true;
    }
    return false;
  }

  roomFor(item) {
    if (item.type === 'spell') return true;
    // (Gear for the party goes in their bags, not the pack: src/ui/party.js homeFor.)
    if (item.type === 'hgear') return !!this.o.game.party?.homeFor?.(item);
    const p = this.o.pack, at = p.entries.length;
    if (!p.add(item)) return false;
    p.entries.splice(at, 1);
    return true;
  }

  // ---- gear

  // The best of what it carries on, gems in what has room, every few seconds.
  dress() {
    const { pack, inventory } = this.o;
    let changed = false;
    for (let pass = 0; pass < (this.allow('aiGear') ? 3 : 0); pass++) {
      const base = gearScore(pack.slots);
      let best = null, gain = 0.5;
      for (const e of pack.entries) {
        const slot = SLOT_OF(e.item);
        if (!slot) continue;
        const s = gearScore({ ...pack.slots, [slot]: e.item }) - base;
        if (s > gain) { gain = s; best = e; }
      }
      if (!best) break;
      inventory.quick({ kind: 'pack', item: best.item, entry: best });
      this.o.event?.('wear', { item: best.item, gain });
      changed = true;
    }
    // Gems: every three of a kind and a cut into one of the next first (Pack.combineAll), then the best into whatever's worn
    // with an open socket.
    if (this.allow('aiGems')) {
      const made = pack.combineAll?.() || [];
      if (made.length) { changed = true; this.o.event?.('combine', { made: made.filter((g) => pack.entries.some((q) => q.item === g)) }); }
    }
    if (this.allow('aiGems')) for (const e of [...pack.entries].filter((q) => q.item.type === 'gem').sort((a, b) => this.gemWorth(b.item) - this.gemWorth(a.item))) {
      const into = ['skull', 'main', 'off'].map((s) => pack.slots[s]).find((it) => it && !(it.type === 'shield' && pack.slots.skull) && (it.gems || []).length < Math.min(it.sockets || 0, it.type === 'skull' ? 6 : 4));
      if (!into || !pack.socket(into, e.item)) continue;
      pack.remove(e);
      changed = true;
    }
    if (changed) { inventory.on.change(); inventory.render?.(); }
  }

  gemWorth(gem) { const G = GEMS[gem.kind]; return G ? G.values[gem.grade] * (WORTH[G.stat] || 0) : 0; }

  // What it won't wear: for selling.
  junk() {
    const { pack } = this.o, base = gearScore(pack.slots), sockets = ['skull', 'main', 'off'].some((s) => { const it = pack.slots[s]; return it && (it.gems || []).length < Math.min(it.sockets || 0, it.type === 'skull' ? 6 : 4); });
    return pack.entries.filter((e) => {
      // (Gear for the party: kept while anyone on the roster would be the better for it. src/ui/party.js wantedBy.)
      if (e.item.type === 'hgear') return !this.o.game.party?.wantedBy?.(e.item);
      const slot = SLOT_OF(e.item);
      if (slot) return gearScore({ ...pack.slots, [slot]: e.item }) <= base + 0.5;
      if (e.item.type !== 'gem' || sockets) return false;
      // (A gem with another of its kind and cut beside it is on its way to the next cut, three into one: kept, unless it's
      // Perfect, which nothing is finer than.)
      return e.item.grade >= GEM_GRADES.length - 1 || pack.entries.filter((q) => q.item.type === 'gem' && q.item.kind === e.item.kind && q.item.grade === e.item.grade).length < 2;
    });
  }

  // ---- what to do next

  plan(m) {
    const prev = this.jobKey;
    const chosen = this.choose(m), job = this.homeBy(chosen, m) || chosen;
    const key = job ? `${job.kind}:${job.why}:${job.who ?? ''}:${job.x ?? ''}` : '';
    if (key !== prev || !this.job) { this.job = job; this.jobKey = key; this.patrol = null; this.jobT = this.t; }
    else if (job && this.job) { delete this.job.quest; delete this.job.offer; Object.assign(this.job, job); }
  }

  // What it's working on, for the quest log (src/ui/folk.js): the quest its job is for (quest: one taken on; offer: one it's
  // off to take on), what it says of it, and what it's been set to do (MODES: quests, grinding, dungeon runs).
  doing() {
    const j = this.job;
    return { quest: j?.quest || null, offer: j?.offer || null, say: (j?.quest || j?.offer ? j.say : this.said) || this.said || '', mode: MODES[this.mode]?.name || '' };
  }

  choose(m) {
    const { townUI, pack } = this.o, Q = townUI.quests;
    // Set to fight: only that, wherever it is. (No seals, no town, no party to hire, no quests.)
    if (this.mode === 'fight') return this.fightJob(m);
    const near = (x, z) => dist(m.x, m.z, x, z);
    // A seal near the way that hasn't woken: a step onto it, for the way back.
    const lands = this.o.lands;
    for (const sl of SEALS) {
      if (lands.awake.has(sl.key) || this.skipping(`seal:${sl.key}`)) continue;
      if (dist(m.x, m.z, sl.x, sl.z) < 90) { if (!this.job || this.job.why !== `seal:${sl.key}`) this.sealSince = this.t; if (this.t - (this.sealSince || this.t) > 40) { this.giveUp(`seal:${sl.key}`, 900); break; } return { kind: 'go', why: `seal:${sl.key}`, x: sl.x, z: sl.z, r: 1.6, say: `Waking the seal of ${sl.name}.` }; }
    }
    // A full pack, or a deal of things to sell: to the town.
    const junk = this.allow('aiSell') ? [...this.junk(), ...(this.o.game.party?.bagJunk?.() || [])] : [];
    const room = this.freeCells();
    // (Only while there's someone open to buy it: at night the town's counters are shut, and it keeps at its work.)
    const buyer = junk.length > 0 && PEOPLE.some((p, i) => TRADES[p.trade]?.buys && this.o.townUI.isOpen(i));
    // (Out on the first visit to Phobos, home to sell only once the pack's all but full: home's a beacon stone and a seal back
    // away, and a run that went home with the Redoubt in hand stopped to take the square's offers. src/folk/first-visit.js.)
    const visiting = this.firstVisit(m);
    // (A camp's sutler nearer than the town, src/folk/shops.js sutler: the pack's emptied there, where the work is.)
    const wantsSell = junk.length > 0 && (visiting ? room < 3 : (room < 10 || junk.length >= 6));
    const sutler = junk.length > 0 && !m.town ? this.sutler(m, wantsSell ? Math.max(120, townDist(m.x, m.z) * 0.8) : 70) : -1;
    if (sutler >= 0 && (wantsSell || junk.length >= 3) && !inDungeon(m.x, m.z)) return { kind: 'talk', why: 'sell', who: sutler, say: `Selling to ${townUI.people[sutler].name}.` };
    const wantsTown = (wantsSell && buyer) || (m.hpf < 0.45 && !this.known(SP.mend));
    const questing = this.mode === 'quests';
    // Once it's at the black knight, it sees him through (unless he's done it in, and it's falling back to mend).
    if (questing && this.job?.kind === 'boss' && this.blackKnight(this.snap) && m.hpf > 0.4) return this.job;
    // Down the Warrens, the Warrens; a party to hire when it's ready for one; then the Warrens themselves when it's strong enough.
    // (But a word with someone who stands down a delve, the sewer-keepers, the princess, the Librarian's household, first:
    // delveTalk. And a quest that wants a ward gone into from this one goes on through its gate: warrensJob, delveWay.)
    if (inDungeon(m.x, m.z)) return this.mode === 'dungeons' ? this.dungeonJob(m) || warrensJob(this, m) : (questing && this.delveTalk(m)) || warrensJob(this, m, this.delveWants(m));
    // (Not out on the first visit to Phobos: the only one hiring is in Bellmourn, and the Redoubt's gone into alone.)
    // (Not while there's a quest's work within reach of where it stands: it used to leave a camp half done to walk home
    // and hire, or to go down the Warrens. nearWork.)
    const busy = questing && !m.town && !!this.nearWork(m, 500);
    const hire = visiting || busy ? null : hireJob(this, m);
    if (hire) return hire;
    // (With a quest still to do, only the dungeon a quest in hand wants: delveOwed. Round them for their own sake after.)
    const delve = questing && !busy && warrensJob(this, m, this.delveWants(m), this.delveOwed());
    if (delve && !wantsTown) return delve;
    // Out at Phobos on the first visit (src/folk/first-visit.js): Wenna's work, all of it, before anything a country away,
    // and her offers taken as they come (she's there on the Sill, by the door home). And back home through the door, the
    // word with Lisandra before the town's own errands and offers.
    if (visiting) {
      for (const id of FIRST_VISIT) {
        const s = Q.state(id);
        if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
        const job = this.questJob(id, m, LEVEL_OF[id]);
        if (job) return job;
      }
      const offer = this.offerJob(m, FIRST_VISIT);
      if (offer) return offer;
    }
    // In the town, its errands: the quest talk first (only when it's on the quests), then the shops.
    // (Home to sell on the first visit: selling, not the town's offers. Wenna's work comes first.)
    const errand = this.errand(m, m.town || wantsTown || townDist(m.x, m.z) < 60, questing && !visiting);
    if (errand) return errand;
    if (wantsTown && !m.town && !this.skipping('town')) return { kind: 'go', why: 'town', x: 2, z: 3, r: 6, say: room < 10 ? 'Back to Bellmourn: the pack is full.' : 'Back to Bellmourn to sell.' };
    // What the land's calling it to, close by and now: a raid, a tear, something left lying.
    const wild = this.wildJob(m);
    if (wild) return wild;
    // Set to grinding: only that. Set to dungeon runs: the next dungeon round, or grinding while there's none it can run.
    if (this.mode === 'grind') return this.wildJob(m, true) || this.grindJob(m, this.grind, 'grind');
    if (this.mode === 'dungeons') return this.dungeonJob(m) || this.grindJob(m, this.grind, 'grind', 'No dungeon it can run just now: grinding meanwhile.');
    // By night, what can only be done by night.
    if (isNight(m.hour) || m.hour >= 19.5) {
      for (const [id, lvl] of PLAN_ALL) {
        const st = Q.step(id);
        if (!st || this.skipping(`q:${id}`) || !(st.night || st.warden)) continue;
        const job = this.questJob(id, m, lvl);
        // (Only what it can get to before morning: it was pulled back a country for a night step at dusk.)
        if (job && this.jobDist(job, m) < 1200) return job;
      }
    }
    // Lisandra's door east, once Bram's errand's done: before the rest of her round of the town, a letter or anything else in
    // hand. It's to come in the game's first quarter hour (src/folk/first-visit.js), and the trail's on her (follow 'door').
    if (questing && Q.needsMet(FIRST_VISIT[0]) && !Q.state(FIRST_VISIT[0]) && RULES[FIRST_VISIT[0]]) {
      const door = this.offerJob(m, [FIRST_VISIT[0]]);
      if (door) return door;
    }
    // What's ready to hand in, or a word that moves a quest on: before more work.
    // (The nearest of them first: out in a small town, the word with the innkeeper across the green before the long way
    // home to hand something in.)
    // (Work to be had from anyone a few strides off, out of the town: taken as it comes to a camp, from everyone there,
    // so the camp's whole round is in hand before it sets out. It used to take only what the one it was sent to had, and
    // came back for the other's when everything else in the land was done.)
    if (questing && !visiting && !m.town) { const by = this.offerJob(m, null, 120); if (by) return by; }
    let near1 = null, nd1 = Infinity, low1 = null, lowLvl = 0, lowD = Infinity, mid1 = null, midD = Infinity;
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const ready = st?.talk || st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready);
      if (!ready) continue;
      const job = this.questJob(id, m, lvl);
      if (!job) continue;
      const d = this.jobDist(job, m);
      if (d < nd1) { nd1 = d; near1 = job; }
      // (The first of them in the plan's order, the lowest level's, and the nearest of that level: for when none is near.)
      if (!low1 || (lvl === lowLvl && d < lowD)) { low1 = job; lowLvl = lvl; lowD = d; }
      // (And a word that's the end of an errand already under way, its fight on the road done: the nearest such.)
      if (st?.talk && s.step > 0 && d < midD) { mid1 = job; midD = d; }
    }
    // (A hand-in close by waits while another quest's work is as close: a camp's work is done in one round, the lair, the
    // den past it and the things lying round the den, and then all of it told. Each used to be its own walk out and back.)
    if (near1 && nd1 < 500) return this.nearWork(m, 450) || near1;
    // (None near: the lowest level's, not the nearest as the crow flies. With an errand in hand for each road out of
    // Bellmourn, the nearest took it from one spoke's end across the town to the next and back.)
    // (But an errand half done is finished first, when its end is within a kilometre: with the goat on the Gallows Road
    // down and Thornwick 700 m on, it turned round for a lower word three kilometres behind.)
    if (mid1 && midD < 1000) return mid1;
    if (near1 && low1) near1 = low1;
    // (A hand-in a country away waits while there's a quest's work close by: the hunt over the hedge before the road home.)
    if (near1) {
      let work = null;
      for (const [id, lvl] of PLAN_ALL) {
        const s = Q.state(id);
        if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
        const job = this.questJob(id, m, lvl);
        if (!job || job === near1 || job.quest === near1.quest) continue;
        if (this.jobDist(job, m) < 500) return job;
        // (And far work it's of a level for, the lowest first, before a far word: the rest of the ring round Bellmourn
        // before the errand on from any one camp of it. A word that leads on is for when the work in hand is done.)
        if (!work && (job.kind === 'hunt' || job.kind === 'go')) work = job;
      }
      return work || near1;
    }
    // The black knight on the cathedral's steps, once it's strong enough for him.
    if (this.blackKnight(this.snap) && m.own >= BOSS_LEVEL + (this.bump['boss:black'] || 0) && !this.skipping('boss:black') && !(isNight(m.hour) && m.own < BOSS_LEVEL + 4)) {
      return { kind: 'boss', why: 'boss:black', say: 'To the cathedral steps: the black knight.' };
    }
    // The quests, in order; but one whose work is close by (within half a kilometre) before one that's a country away.
    let first = null;
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const job = this.questJob(id, m, lvl);
      if (!job) continue;
      if (this.jobDist(job, m) < 500) return job;
      first ||= job;
    }
    if (first) return first;
    // Quests not yet taken: to their givers.
    const offer = this.offerJob(m);
    if (offer) return offer;
    const all = Object.keys(RULES).every((id) => Q.done(id));
    if (all) {
      if (!this.allDone) { this.allDone = true; this.o.allDone(); }
      return this.wildJob(m, true) || this.grindJob(m, this.grind, 'grind');
    }
    // Nothing it can do yet: levels.
    void pack; void near;
    // (A bounty it's up to, before the woods again.)
    const bounty = this.wildJob(m, true);
    if (bounty) return bounty;
    return this.grindJob(m, m.lvl >= 6 && Q.state('dead_cant_wait') ? 'catacombs' : 'woods', 'level');
  }

  // What the living land's calling it to, if it's up to it (src/ui/wilds.js calls): a town that's raided, an open tear in
  // sight, something left lying close by. bounty: the bounty in hand instead, which waits for when there's nothing nearer.
  // It walks into a tear only when it's whole, and gives one up for ten minutes once it's had to run from it.
  wildJob(m, bounty = false) {
    const W = this.o.game?.wilds;
    if (!this.allow('aiWild') || !W?.calls || m.below || inDungeon(m.x, m.z)) return null;
    for (const c of W.calls([m.x, m.z])) {
      const why = `wild:${c.why}:${Math.round(c.x)},${Math.round(c.z)}`;
      if ((c.why === 'bounty') !== bounty || this.skipping(why) || m.lvl < c.lvl - WILD_UNDER[c.why]) continue;
      // (Not through ground it's keeping clear of: an outpost it isn't ready for.)
      if (c.why !== 'bounty' && this.avoid(m).some(([x, z, r]) => dist(c.x, c.z, x, z) < r)) continue;
      const say = WILD_SAY[c.why](c);
      if (c.why === 'find') return { kind: 'go', why, x: c.x, z: c.z, r: 2.4, say };
      if (c.why === 'tear') {
        if (c.fight) { if (m.hpf < 0.3) { this.giveUp(why, 600); continue; } return { kind: 'hunt', why, spots: [[c.x, c.z]], say }; }
        if (m.hpf < 0.7) continue;
        return { kind: 'go', why, x: c.x, z: c.z, r: 6, say };
      }
      return { kind: 'hunt', why, spots: [[c.x, c.z]], say };
    }
    return null;
  }

  // A quest in hand whose work (a hunt, a den, things to gather, a place to see: not a word with someone) is within `reach`
  // metres of where it stands, and of a level it has: the nearest such job, or null.
  nearWork(m, reach) {
    const Q = this.o.townUI.quests;
    let best = null, bd = reach;
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage !== 'active' || !st || st.talk || st.back || st.bring || st.start || this.skipping(`q:${id}`)) continue;
      const job = this.questJob(id, m, lvl);
      if (!job || (job.kind !== 'hunt' && job.kind !== 'go')) continue;
      const d = this.jobDist(job, m);
      if (d < bd) { bd = d; best = job; }
    }
    return best;
  }

  // The nearest of those out in the land who'll buy what it carries (a camp's sutler), within `within` metres: their
  // place in the town's list, or -1.
  sutler(m, within) {
    const T = this.o.townUI;
    let best = -1, bd = within;
    for (let i = PEOPLE.length; i < T.people.length; i++) {
      if (!TRADES[T.people[i].trade]?.buys || this.skipping(`sell:${i}`) || this.skipping(`p:${i}`)) continue;
      const w = T.whereOf(i), d = w ? dist(m.x, m.z, w.x, w.z) : Infinity;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  freeCells() {
    const p = this.o.pack;
    let used = 0;
    for (const e of p.entries) { const s = e.item.type === 'weapon' ? 4 : e.item.type === 'shield' ? 6 : e.item.type === 'skull' ? 4 : e.item.type === 'robe' ? 4 : 1; used += s; }
    return p.cells - used;
  }

  // The giver of a quest, or whoever a step's to be said to: their place in the town's list.
  personIndex(id) { return this.o.townUI.people.findIndex((p) => p.id === id); }

  // A word with someone who stands down a delve (Phobos's sewer-keepers and their princess, the Librarian's household): a
  // quest's word with them, or its giver to go back to, or work they have. Gone to by that delve's portal, or the gate to it
  // from the one it's down (approach, delveWay). Asked down a delve: the rest of its talk waits till it's out.
  delveTalk(m) {
    const { townUI } = this.o, Q = townUI.quests;
    const down = (i) => { const w = i >= 0 ? townUI.whereOf(i) : null; return !!w && !!delveAt(w.x, w.z); };
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done' || !st) continue;
      const q = QUESTS[id], who = st.talk ? this.personIndex(st.talk) : st.back ? this.personIndex(q.giver) : -1;
      if (!down(who) || (st.talk && m.lvl < lvl + (this.bump[`q:${id}`] || 0))) continue;
      const j = this.talkJob(who, 'quest', `${q.title}: to ${townUI.people[who].name}.`);
      if (j) return { ...j, quest: id };
    }
    const o = this.offerJob(m);
    return o && down(o.who) ? o : null;
  }
  // Whether a gate between delves shut till a boss has died is open: it has died, now or ever (src/sim/dungeon.js open).
  gateOpen = (key) => this.o.townUI.quests.flags.has(key.includes(':') ? key : `boss:${key}`) || !!this.o.game.party?.warrens?.down?.includes(key);

  // The party dungeons the quests it has in hand send it down, and is of a level for: to go in, to kill there, or for a boss.
  delveWants(m) {
    const Q = this.o.townUI.quests, out = [];
    for (const [id, lvl] of PLAN_ALL) {
      const st = Q.step(id);
      if (!st || m.lvl < lvl + (this.bump[`q:${id}`] || 0)) continue;
      const farm = st.bring && DELVE_KEYS.includes(st.at) && (this.o.pack.mats[st.bring] || 0) < st.n;
      // (And rooms down one to walk or kill in, 'room:<id>': its way through goes through every room. roomDelve.)
      const seen = Q.state(id)?.seen || [], room = roomDelve(st.kill) || roomDelve(st.enter) || (st.visit || []).filter((v) => !seen.includes(v)).map(roomDelve).find(Boolean);
      const k = st.boss ? BOSSES.find((b) => b.key === st.boss)?.delve : DELVE_KEYS.includes(st.enter) ? st.enter : DELVE_KEYS.includes(st.kill) ? st.kill : farm ? st.at : room;
      if (k && !out.includes(k)) out.push(k);
    }
    return out;
  }

  // The dungeons some quest not yet done still has work down (taken or not): left alone till that quest sends it there.
  // It used to go down the first it was fit for, before the quests that lead to it: the Warrens at 7 with none of its four
  // quests in hand, four levels from the clear, then off to the Deeps with the quests of levels 4 to 12 not begun, and
  // every dungeon to do again for each quest.
  delveOwed() {
    const Q = this.o.townUI.quests, out = new Set();
    // (And while any quest at all is still to do, none for its own sake: with only the keep's last two left it went round
    // the Warrens again first.)
    if (!this.allQuestsDone()) return new Set(DELVE_KEYS);
    for (const [id, r] of Object.entries(RULES)) {
      if (Q.done(id)) continue;
      for (const st of r.steps || []) {
        const k = st.boss ? BOSSES.find((b) => b.key === st.boss)?.delve : DELVE_KEYS.includes(st.enter) ? st.enter : DELVE_KEYS.includes(st.kill) ? st.kill : roomDelve(st.kill) || roomDelve(st.enter) || (st.visit || []).map(roomDelve).find(Boolean) || null;
        if (k) out.add(k);
      }
    }
    return out;
  }

  // How far off a job's work is: whoever it's a word with, the place it goes to, the nearest of its hunting spots.
  jobDist(job, m) {
    if (job.kind === 'talk') { const w = this.o.townUI.whereOf(job.who); return w ? dist(m.x, m.z, w.x, w.z) : 1e9; }
    if (job.spots?.length) return Math.min(...job.spots.map(([x, z]) => dist(m.x, m.z, x, z)));
    return Number.isFinite(job.x) ? dist(m.x, m.z, job.x, job.z) : 0;
  }

  // A quest's next piece of work, marked with the quest it's for (the quest log shows which one it's on).
  questJob(id, m, lvl) {
    const job = this.questStep(id, m, lvl);
    if (job) job.quest = id;
    return job;
  }

  questStep(id, m, lvl) {
    const Q = this.o.townUI.quests, s = Q.state(id), st = Q.step(id), q = QUESTS[id], title = q.title;
    const giver = this.personIndex(q.giver);
    if (s.stage === 'making') {
      if (this.o.town.day < s.ready) return null;
      return this.talkJob(giver, 'quest', `${title}: to collect it.`);
    }
    if (!st) return null;
    if (st.talk) {
      const who = this.personIndex(st.talk);
      if (who >= PEOPLE.length && m.lvl < lvl + (this.bump[`q:${id}`] || 0)) return null;
      return this.talkJob(who, 'quest', `${title}: a word with ${this.o.townUI.people[who]?.name}.`);
    }
    if (st.back) return this.talkJob(giver, 'quest', `${title}: back to ${this.o.townUI.people[giver]?.name}.`);
    if (st.start) {
      // Work from each of a list of people: the nearest it can reach that it hasn't had any from.
      const seen = s.seen || [], W = this.o.townUI;
      let best = null, bd = Infinity;
      // (Bram first while his errand's not taken: it's what opens Lisandra's door east, and that's to come in the game's
      // first quarter hour. src/folk/first-visit.js; src/ui/trail.js does the same.)
      const bramFirst = !this.o.townUI.quests.state('bed_and_bell');
      for (const p of st.start) {
        const i = this.personIndex(p), w = i >= 0 && !seen.includes(p) && !this.skipping(`p:${i}`) && this.reachable(i) ? W.whereOf(i) : null;
        const d = w && (bramFirst && p === 'bram' ? 0 : dist(m.x, m.z, w.x, w.z));
        if (w && d < bd) { bd = d; best = i; }
      }
      return best === null ? null : this.talkJob(best, 'offer', `${title}: to ${W.people[best].name} for work (${seen.length} of ${st.start.length}).`);
    }
    if (st.bring) {
      if ((this.o.pack.mats[st.bring] || 0) >= st.n) return this.talkJob(giver, 'quest', `${title}: ${st.n} ${matName(st.bring, st.n)} to hand over.`);
      // (Down a delve, for what grows on its dead: the delve's own work, delveWants.)
      if (DELVE_KEYS.includes(st.at)) return null;
      // Bone the woods' dead give up; iron and silk come from those buried down in the catacombs.
      const deep = st.bring !== 'bone' || (this.o.pack.mats.bone || 0) < 2;
      if (deep && Q.state('dead_cant_wait') && m.lvl >= 3) return this.grindJob(m, 'catacombs', `farm:${id}`, `${title}: ${matName(st.bring, 2).toLowerCase()} from the catacombs (${this.o.pack.mats[st.bring] || 0} of ${st.n}).`);
      // (Out of the catacombs, bone and a little iron come off the woods' dead as it grinds for levels anyway.)
      return null;
    }
    if (m.lvl < lvl + (this.bump[`q:${id}`] || 0)) return null;
    // Down a party dungeon (to go in, to kill there, a boss of it, a room of it to walk): the delve's own work, with a party (delveWants).
    if (st.boss || DELVE_KEYS.includes(st.enter) || DELVE_KEYS.includes(st.kill) || roomDelve(st.kill) || roomDelve(st.enter) || (st.visit || []).some((v) => roomDelve(v) && !(s.seen || []).includes(v))) return null;
    if (st.enter) {
      if (st.night && !isNight(m.hour) && !(m.hour >= 19.5)) return null;
      // (A lair or a den to come to by night: not at dusk. It got there early, stood in its monsters' sight and fought
      // them under "by night" with the step not yet to be had.)
      if (st.night && !isNight(m.hour) && (st.enter.startsWith('outpost:') || st.enter.startsWith('lair:'))) return null;
      const a = area(st.enter);
      if (!a) return null;
      // (Nor a night step from a country away, whichever part of choose asks: it set off at dusk, lost the job at dawn,
      // turned round, and did the same the next night.)
      if (st.night && dist(m.x, m.z, a.x, a.z) > 1200) return null;
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: a.r, below: a.below, say: `${title}: to ${st.enter === 'catacombs' ? 'the catacombs' : st.enter === 'bellcrypt' ? 'the Bell Crypt' : placeName(st.enter)}${st.night ? ', by night' : ''}.` };
    }
    if (st.visit) {
      const seen = s.seen || [];
      const left = st.visit.filter((v) => !seen.includes(v)).map((v) => ({ v, a: area(v) })).filter((q) => q.a).sort((a, b) => dist(m.x, m.z, a.a.x, a.a.z) - dist(m.x, m.z, b.a.x, b.a.z));
      if (!left.length) return null;
      const { v, a } = left[0];
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: Math.min(a.r, 25), say: `${title}: to ${placeName(v)} (${seen.length} of ${st.visit.length}).` };
    }
    // An outpost to empty: to it, and everything in it put down, its chief with them.
    if (st.clear) {
      const a = area(`outpost:${st.clear}`);
      return a ? { kind: 'hunt', why: `q:${id}`, spots: [[a.x, a.z]], say: `${title}: to empty ${placeName(`outpost:${st.clear}`)}.` } : null;
    }
    // Things to gather: to the nearest still lying there (walked up to, it's picked up: src/folk/quests.js where).
    if (st.gather) {
      const got = s.got || [], left = gatherSpots(id, st).map((p, i) => ({ p, i })).filter(({ i }) => !got.includes(i) && !this.skipping(`g:${id}:${i}`));
      if (!left.length) return null;
      left.sort((a, b) => dist(m.x, m.z, a.p[0], a.p[1]) - dist(m.x, m.z, b.p[0], b.p[1]));
      return { kind: 'go', why: `q:${id}`, x: left[0].p[0], z: left[0].p[1], r: 1.4, mark: `g:${id}:${left[0].i}`, say: `${title}: ${st.what || 'what was asked for'}, ${s.n || 0} of ${st.n}.` };
    }
    if (st.kill) {
      if (st.kill === 'catacombs') return this.grindJob(m, 'catacombs', `q:${id}`, `${title}: the dead below (${s.n} of ${st.n}).`);
      const a = area(st.kill);
      return { kind: 'hunt', why: `q:${id}`, spots: st.spots || huntsFor(st.kill) || (a ? [[a.x, a.z]] : HUNTS.woods), below: !!a?.below, say: `${title}: ${st.n - s.n} more to put down.` };
    }
    if (st.warden) {
      if (!isNight(m.hour)) return null;
      return { kind: 'hunt', why: `q:${id}`, spots: HUNTS.bellcrypt, below: true, say: `${title}: the bell's warden.` };
    }
    return null;
  }

  talkJob(i, why, say) {
    if (i < 0 || this.skipping(`p:${i}`)) return null;
    if (!this.reachable(i)) {
      // (One of Phobos's people who keeps to a district, not about while you're far from it: to the district, where they
      // come out as you near it, src/folk/brain.js AREA_REACH.)
      const at = this.crowdSpot(i);
      return at ? { kind: 'go', why, x: at.x, z: at.z, r: 30, say: `${say} (to ${at.name})` } : null;
    }
    return { kind: 'talk', why, who: i, say };
  }

  // Where to go for someone of Phobos's who keeps to a district and isn't about: its middle. Null for anyone else, or
  // anyone who's about.
  crowdSpot(i) {
    const p = this.o.townUI.people[i];
    if (!p?.area || this.o.townUI.whereOf(i)) return null;
    const d = PHOBOS.districts.find((q) => q.key === p.area);
    return d ? { x: d.x, z: d.z, name: d.name || p.area } : null;
  }

  // Someone it can walk up to now: on the ground floor (it doesn't take stairs), awake or easily woken, and not running from something.
  reachable(i) {
    const w = this.o.townUI.whereOf(i);
    if (!w) return false;
    // (Someone out past the town, a knight at his post or a villager at theirs: on the ground, in the open.)
    if (w.beyond || i >= PEOPLE.length) return true;
    return !(w.busy === 12 || w.busy === 13) && (w.level | 0) <= 0 && w.y < 2.2;
  }

  // Out on the first visit to Phobos (src/folk/first-visit.js): Lisandra's door taken (from the moment it's taken: the
  // city's own givers stand about the Sill too, and Wenna's first) and the way home not yet, and either within a mile and
  // a half of the Sill or with any of its quests in hand: home by the beacon stone to sell, back out to the Sill after, not
  // off on Bellmourn's own (a run went home with the Redoubt in hand, took the pines and a party, and came back two levels up).
  firstVisit(m) {
    const Q = this.o.townUI.quests, last = FIRST_VISIT[FIRST_VISIT.length - 1];
    return !!Q.state(FIRST_VISIT[0]) && !Q.done(last) && (dist(m.x, m.z, SILL_DOOR.x, SILL_DOOR.z) < 1500 || FIRST_VISIT.some((id) => Q.state(id)?.stage === 'active'));
  }

  offerJob(m, only = null, reach = Infinity) {
    const { townUI } = this.o, Q = townUI.quests;
    let best = null, bd = Infinity;
    for (const [id, lvl] of PLAN_ALL) {
      if ((only && !only.includes(id)) || Q.state(id) || !Q.needsMet(id)) continue;
      // (One you've just dropped from the quest log is left be a while: it isn't to be taken straight back up.)
      if (Q.droppedLately?.(id, DROP_REST)) continue;
      const giver = this.personIndex(QUESTS[id].giver);
      if (giver < 0 || this.skipping(`p:${giver}`) || (!this.reachable(giver) && !this.crowdSpot(giver))) continue;
      // (Far-off work can wait till it's nearly ready for it.)
      if (m.lvl + 3 < lvl) continue;
      const w = townUI.whereOf(giver) || this.crowdSpot(giver);
      if (!w || dist(m.x, m.z, w.x, w.z) > reach) continue;
      // (Lisandra's door east, once Bram's errand's done: first, before anyone nearer, as the trail leads a player there.
      // src/folk/first-visit.js: the first visit's to be in the game's first quarter of an hour. And so, before the rest of
      // the town's offers, her own work and then Bram's errand, which is what opens the door: a run took every other offer
      // in the square first, and came to the door at a quarter past.)
      const d = id === FIRST_VISIT[0] ? 0 : id === 'lisandra_work' ? 0.5 : id === 'bed_and_bell' ? 1 : dist(m.x, m.z, w.x, w.z);
      // (Someone out past the town, like the Bellwright: only on the way.)
      // (Or once it's of a level for their work: then it goes out to them, however far.)
      if (giver >= PEOPLE.length && d > 300 && m.lvl < lvl) continue;
      if (d < bd) { bd = d; best = this.talkJob(giver, 'offer', `To ${townUI.people[giver].name}: there's work.`); if (best) best.offer = id; }
    }
    return best;
  }

  // What the town's for, if it's there or near: quest talk, then selling, mending, a bed.
  errand(m, here, quests = true) {
    if (!here) return null;
    const { townUI, pack } = this.o, Q = townUI.quests;
    // (The quests' own talk in the town comes through questJob and offerJob: those first, wherever it is.)
    if (quests) for (const [id] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done') continue;
      const q = QUESTS[id], giver = this.personIndex(q.giver);
      const talkTo = st?.talk ? this.personIndex(st.talk) : (st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready)) ? giver : -1;
      if (talkTo >= 0 && talkTo < PEOPLE.length && !this.skipping(`p:${talkTo}`) && this.reachable(talkTo)) return { ...this.talkJob(talkTo, 'quest', `${q.title}: to ${townUI.people[talkTo].name}.`), quest: id };
    }
    const offer = quests && this.offerJob(m);
    // (Work to be had here in the town, that is: from someone a country away it waits its turn in choose(), after the
    // work in hand. Any giver at all used to count while it was within 140 m of the square, so on its way west to one
    // in Cinderford it crossed that line, turned back east for the catacombs, crossed it again and turned west, and went
    // on doing so, ten minutes and four levels of the dead that came up round it, for as long as it was watched.)
    if (offer && dist(m.x, m.z, 0, 0) < 140 && this.jobDist(offer, m) < 320) return offer;
    // Selling: to whoever gives most for the most of it, while they're open.
    const trading = this.allow('aiSell');
    const junk = trading ? [...this.junk(), ...(this.o.game.party?.bagJunk?.() || [])] : [];
    if (junk.length >= 2 || (this.freeCells() < 16 && junk.length)) {
      let best = null, most = 0;
      for (let i = 0; i < PEOPLE.length; i++) {
        const t = PEOPLE[i].trade;
        if (!TRADES[t]?.buys || this.skipping(`p:${i}`) || !townUI.isOpen(i) || !this.reachable(i)) continue;
        const sum = junk.reduce((n, e) => n + offerFor(t, e.item), 0);
        if (sum > most) { most = sum; best = i; }
      }
      if (best !== null) return { kind: 'talk', why: 'sell', who: best, say: `Selling to ${PEOPLE[best].name}.` };
    }
    // Buying: whatever an open counter has that's better than what it wears, or a spell it doesn't know, with coin to spare.
    const buy = trading && this.shopping(m);
    if (buy) return buy;
    // More room in the pack from Wes Harrow, with coin to spare for it (src/ui/folk.js letOut).
    const room = trading && this.roomJob();
    if (room) return room;
    // Mended at the herbalist's, if it's hurt and has the coin.
    if (trading && m.hpf < 0.7 && pack.purse() >= 12) {
      const i = PEOPLE.findIndex((p) => p.trade === 'healing');
      if (i >= 0 && townUI.isOpen(i) && !this.skipping(`p:${i}`) && this.reachable(i)) return { kind: 'talk', why: 'mend', who: i, say: `To ${PEOPLE[i].name}, to be mended.` };
    }
    // A night at the Tolling Bell: when a quest waits on tomorrow, or it's late and it's tired.
    const h = m.hour;
    const making = Object.keys(RULES).some((id) => Q.state(id)?.stage === 'making' && this.o.town.day >= 0 && this.o.town.day < Q.state(id).ready);
    const nightWork = quests && PLAN_ALL.some(([id, lvl]) => { const st = Q.step(id); return st && (st.night || st.warden || (st.kill === 'barrows')) && m.lvl >= lvl; });
    if (this.allow('aiSleep') && h >= 18.3 && h < 23.5 && (making || (m.hpf < 0.5)) && !nightWork && pack.purse() >= 4) {
      const i = PEOPLE.findIndex((p) => p.trade === 'inn');
      if (i >= 0 && !this.skipping(`p:${i}`) && this.reachable(i)) return { kind: 'talk', why: 'bed', who: i, say: `A bed at the Tolling Bell${making ? ': a quest waits on the morning' : ''}.` };
    }
    return null;
  }

  // The best buy in the town's stock today: { kind: 'talk', why: 'buy', who, item }, or null.
  shopping(m) {
    const { townUI, pack } = this.o, purse = pack.purse(), base = gearScore(pack.slots);
    let best = null, most = 0;
    for (let i = 0; i < PEOPLE.length; i++) {
      const t = PEOPLE[i].trade;
      if (!TRADES[t]?.stock || this.skipping(`buy:${i}`) || !townUI.isOpen(i) || !this.reachable(i)) continue;
      for (const it of townUI.stockOf(t)) {
        const price = (it.type === 'spell' ? 120 : worth(it)) * 10;
        // (Never more than two thirds of what's in the purse.)
        if (price > purse * 0.66) continue;
        let gain = 0;
        if (it.type === 'spell') gain = this.known(it.spell) ? 0 : 40;
        else if (SLOT_OF(it)) gain = gearScore({ ...pack.slots, [SLOT_OF(it)]: it }) - base;
        if (gain > 3 && gain / Math.sqrt(price) > most) { most = gain / Math.sqrt(price); best = { kind: 'talk', why: 'buy', who: i, item: it, say: `Buying from ${PEOPLE[i].name}.` }; }
      }
    }
    return best;
  }

  grindJob(m, where, why, say) {
    if (where === 'catacombs') {
      // (Nobody left down there: hunt()'s round found none. A quest's work there waits; grinding goes to the woods meanwhile.)
      const dry = this.skipping('dry:catacombs');
      if (dry && /^(q|farm):/.test(why)) return null;
      if (!this.o.townUI.quests.state('dead_cant_wait') || dry) where = 'woods';
      else {
        const sp = this.catacombSpots(m);
        if (sp.length) return { kind: 'hunt', why, spots: sp, below: true, dries: true, say: say || 'Grinding in the catacombs.' };
        where = 'woods';
      }
    }
    if (where === 'lairs') {
      const ok = LAIRS.filter((l) => m.lvl >= (lairLevel(l) || 10)).map((l) => [l.x, l.z]).sort((a, b) => dist(m.x, m.z, a[0], a[1]) - dist(m.x, m.z, b[0], b[1])).slice(0, 4);
      if (ok.length) return { kind: 'hunt', why, spots: ok, say: say || 'Grinding the monster lairs.' };
      where = 'woods';
    }
    if (where === 'jellies') return { kind: 'hunt', why, spots: [...HUNTS.millhaven, ...HUNTS.fen], say: say || 'Grinding the jelly camps.' };
    if (where === 'roam') {
      const sites = Object.keys(SITES).filter((k) => !this.avoid(m).some(([x, z, r]) => dist(SITES[k].x, SITES[k].z, x, z) < r)).map((k) => [SITES[k].x, SITES[k].z]);
      return { kind: 'hunt', why, spots: sites, roam: true, say: say || 'Roaming the land.' };
    }
    const lvl = m.lvl, avoid = this.avoid(m);
    const spots = HUNTS.woods.filter(([x, z]) => !avoid.some(([ax, az, r]) => dist(x, z, ax, az) < r));
    void lvl;
    return { kind: 'hunt', why, spots, say: say || 'Grinding in the woods round Bellmourn.' };
  }

  // The catacombs' spawn points it'll walk, deeper as it grows: the Bell Crypt and the Reliquary, then down the second stair
  // to the Founders' Hall, the Abbots' Gallery and the Tomb. Never the rift, nor the room across it.
  catacombSpots(m) {
    const from = churchAt(172, 0), n = 6 + m.lvl * 2;
    return this.nav.spawns.filter(([, z]) => z > RIFT_Z).sort((a, b) => dist(a[0], a[1], from[0], from[1]) - dist(b[0], b[1], from[0], from[1])).slice(0, n);
  }

  // ---- the beacon stone, and room in the pack

  // Home by the beacon stone (src/ui/beacon.js), in place of the long walk: when the job's work is in Bellmourn (to sell, to
  // mend, a quest to hand in there) and it's further off than BEACON_FAR, the stone's lit, and there's nothing near enough
  // to break it off. Not down a delve or in the Test Dungeon (their own ways out are theirs), nor if Settings has it walk.
  homeBy(job, m) {
    const b = this.o.game.beacon;
    if (!job || !b || (job.kind !== 'talk' && job.kind !== 'go') || m.town || !this.allow('aiBeacon') || this.skipping('beacon')) return null;
    if (inDungeon(m.x, m.z) || inHall(m.x, m.z) || this.nearFoe < BEACON_CLEAR) return null;
    const w = job.kind === 'talk' ? this.o.townUI.whereOf(job.who) : Number.isFinite(job.x) ? { x: job.x, z: job.z } : null;
    if (!w || townDist(w.x, w.z) > 40 || dist(m.x, m.z, w.x, w.z) < BEACON_FAR || !b.ready(this.snap)) return null;
    return { kind: 'beacon', why: 'beacon', say: `The beacon stone, home to Bellmourn. (${job.say || 'To the town.'})` };
  }

  beaconUse(snap) {
    const b = this.o.game.beacon;
    this.halt();
    this.say(this.job.say);
    if (b.busy) return;
    if (b.ready(snap)) b.use(snap);
    // (Once it's begun, think() keeps it still. Broken off, it isn't tried again for a while: the walk instead.)
    this.giveUp('beacon', 25);
    this.job = null;
  }

  // Worth another pocket from Wes Harrow: there's room still to be had, and it costs no more than a tenth of the purse.
  wantsRoom() {
    const p = this.o.pack;
    return p.extra < MAX_EXTRA && slotPrice(p.extra) * 10 <= p.purse() * 0.1;
  }

  roomJob() {
    if (!this.wantsRoom() || this.skipping('room')) return null;
    const i = this.personIndex(PACK_MAKER), W = this.o.townUI;
    if (i < 0 || this.skipping(`p:${i}`) || !W.whereOf(i) || !this.reachable(i)) return null;
    return { kind: 'talk', why: 'room', who: i, say: `To ${W.people[i].name}, to have the pack let out.` };
  }

  // ---- doing it

  doJob(snap, m, foes) {
    const j = this.job;
    if (!j) { this.halt(); this.say('Thinking.'); return; }
    if (j.kind === 'go') {
      this.say(j.say);
      if (j.why === 'town' && m.town) { this.giveUp('town', 60); this.job = null; this.halt(); return; }
      if (dist(m.x, m.z, j.x, j.z) < j.r && (!j.below || m.below)) {
        // There: the quest moves on as the town sees it (QuestBook.where, twice a second).
        this.halt();
        if (j.why === 'town') { this.giveUp('town', 30); this.job = null; }
        else if (this.t - (this.arriveT || 0) > 6) { this.arriveT = this.t; this.giveUp(j.why, 4); this.job = null; }
        return;
      }
      this.arriveT = this.t;
      this.goTo(j.x, j.z, Math.min(j.r * 0.6, 4), true, false, !!j.below);
      return;
    }
    if (j.kind === 'talk') { this.approach(m, j); return; }
    if (j.kind === 'beacon') { this.beaconUse(snap); return; }
    if (j.kind === 'boss') { this.siege(snap, m); return; }
    if (j.kind === 'hire') { doHire(this, m, j); return; }
    if (j.kind === 'warrens') { this.warrensRun(m, foes); return; }
    if (j.kind === 'hunt') { this.hunt(m, j, foes); return; }
    if (j.kind === 'fight') { this.seek(m, j, foes); return; }
    this.halt();
  }

  // ---- auto fight (the menu's Auto Fight: MODES)

  // Where it was begun is the ground it fights over (fightHere, set afresh each time it's chosen), FIGHT_AREA round it.
  fightJob(m) {
    if (!this.fightHere) this.fightHere = { x: m.x, z: m.z, y: m.y };
    return { kind: 'fight', why: 'fight', say: 'Auto fight: looking for the next one.' };
  }

  // What it'll go after: alive, something it can take (all of it, down a dungeon), on its own level of the ground, not in the
  // town nor somewhere it keeps clear of, and within FIGHT_SEEK of it and FIGHT_AREA of where it began. The nearest.
  fightMark(m, foes) {
    const H0 = this.fightHere, lvl = m.lvl + (this.partyStrong(m) ? 2 : 0), below = inDungeon(m.x, m.z);
    let best = null;
    for (const f of foes) {
      if (f.d > FIGHT_SEEK || (H0 && dist(f.x, f.z, H0.x, H0.z) > FIGHT_AREA)) continue;
      if (this.skipping(`foe:${f.id}`) || this.skipping(`seek:${f.id}`)) continue;
      if (!below && (!fightableAt(f.kind, f.kind === 0 || f.kind === 3 ? m.lvl : lvl, f.maxHp, f.slime) || inTown(f.x, f.z, 4) || this.kept(m, f.x, f.z))) continue;
      if (!best || f.d < best.d) best = f;
    }
    return best;
  }

  // From one to the next: up to the nearest (the fight itself is combat()'s, which takes it on once it's in sight), and with
  // none near enough, back to where it began and a look about till more come.
  seek(m, j, foes) {
    const f = this.fightMark(m, foes);
    if (f) {
      // (One it gets no nearer to in a while, round a wall or up a cliff: let be for a minute, and the next.)
      const S = this.seekOn;
      if (!S || S.id !== f.id) this.seekOn = { id: f.id, best: f.d, t: this.t };
      else if (f.d < S.best - 1.5) { S.best = f.d; S.t = this.t; }
      else if (this.t - S.t > 12 || this.noWay) { this.noWay = null; this.giveUp(`seek:${f.id}`, 60); this.seekOn = null; this.halt(); return; }
      this.say(`Auto fight: after ${this.foeName(f)}.`);
      this.goTo(f.x, f.z, 2, true);
      return;
    }
    this.seekOn = null;
    const H0 = this.fightHere;
    if (H0 && dist(m.x, m.z, H0.x, H0.z) > 12) {
      this.say('Auto fight: back to where it began, to wait for more.');
      this.goTo(H0.x, H0.z, 4, dist(m.x, m.z, H0.x, H0.z) > 30);
      return;
    }
    // Waiting about: a turn now and then, to look round.
    this.halt();
    if (this.t - (this.lookT ?? -99) > 3) { this.lookT = this.t; this.face = this.o.input.yaw + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9); }
    this.say('Auto fight: nothing near. Waiting for more to come.');
  }

  // ---- dungeon runs (the menu's Dungeon Runs: MODES, DUNGEONS)

  // The job for the dungeon it's on, or the next it can run: null when there's none.
  dungeonJob(m) {
    const here = delveOf(m.x, m.z);
    const list = finishedDungeons(this.o.townUI, this.o.game, here?.key);
    if (!list.length) return null;
    // (Down one of them already, as it's set to runs: that one's the run, before any other.)
    if (here && list.some((d) => d.key === here.key) && this.runKey !== here.key) { this.runKey = here.key; this.runState = null; }
    let at = list.findIndex((d) => d.key === this.runKey);
    if (at < 0) { at = 0; this.runKey = list[0].key; this.runState = null; }
    for (let i = 0; i < list.length; i++) {
      const d = list[(at + i) % list.length];
      const job = this.runJob(m, d);
      if (job) { if (d.key !== this.runKey) { this.runKey = d.key; this.runState = null; } return job; }
    }
    return null;
  }

  runJob(m, d) {
    const lap = `lap ${this.laps + 1}`;
    // (With a party fit to go down: hireJob, before this, sees to one if it can pay. Down one already, that one.)
    const P = this.o.game.party, here = delveOf(m.x, m.z);
    // (Down the ward it's gone into from, the Lower for the Middle: on through its gate. doWarrens.)
    if (here && here.key !== d.key && delveByKey(d.key)?.within !== here.key) return null;
    if (!here && !P?.fit()) return null;
    return { kind: 'warrens', why: `run:${d.key}`, delve: d.key, run: d.key, say: `Dungeon runs, ${lap}: ${here ? `down ${lower(d.name)}` : `to ${lower(d.name)}, with the party`}.` };
  }

  // Through one (or beaten back by it): on to the next dungeon, and once round them all, another lap.
  ranDungeon(key, beaten = false, noWay = false) {
    if (this.mode !== 'dungeons') return;
    const list = finishedDungeons(this.o.townUI, this.o.game);
    const d = DUNGEONS.find((x) => x.key === key);
    const at = list.findIndex((x) => x.key === key);
    const next = list.length ? list[(at + 1) % list.length] : null;
    if (at < 0 || at + 1 >= list.length) this.laps++;
    this.runKey = next?.key || null;
    this.runState = null; this.job = null; this.patrol = null;
    this.o.note?.(`Auto-play: ${beaten ? 'beaten back by' : noWay ? 'no way into' : 'through'} ${lower(d?.name || key)}.${next && next.key !== key ? ` On to ${lower(next.name)}.` : ''}`);
  }

  // The Warrens, with three wipes on the same go counting as beaten back: out by the way in, and two levels more first.
  warrensRun(m, foes) {
    const P = this.o.game.party;
    const wipes = P?.wipes || 0;
    if (this.wipeSeen === undefined) this.wipeSeen = wipes;
    if (wipes > this.wipeSeen) { this.wipeSeen = wipes; this.warrensWipes = (this.warrensWipes || 0) + 1; }
    const here = delveOf(m.x, m.z);
    if (here) this.delveIn = here.key;
    if (this.warrensWipes >= 3 && here) {
      this.say(`Beaten back by ${here.name}: out, and stronger first.`);
      const [x, z] = caveWorld(here.exitIn.x, here.exitIn.z, here);
      this.goTo(x, z, 0.5, true);
      return;
    }
    if (this.warrensWipes >= 3) {
      const key = this.delveIn || 'warrens', why = key === 'warrens' ? 'warrens' : `delve:${key}`;
      this.warrensWipes = 0; this.bump[why] = (this.bump[why] || 0) + 2; this.giveUp(why, 900);
      this.o.log?.fell?.(m, m.own, delveByKey(key)?.name || 'A dungeon', null);
      this.job = null;
      this.ranDungeon(key, true);
      return;
    }
    doWarrens(this, m, foes);
  }

  hunt(m, j, foes) {
    this.say(j.say);
    const spots = j.spots.filter(([x, z]) => !this.skipping(`s:${x},${z}`));
    if (!spots.length) { for (const [x, z] of j.spots) this.skip.delete(`s:${x},${z}`); this.halt(); return; }
    if (!this.patrol || !spots.some(([x, z]) => x === this.patrol[0] && z === this.patrol[1])) {
      // The nearest first, then round the rest.
      const fresh = spots.filter((p) => !(this.lastSpots || []).includes(`${p[0]},${p[1]}`));
      const from = fresh.length ? fresh : spots;
      // (Below, the nearest by the stairs: a spot on the floor above is a long walk, however near it lies through the rock.
      // From the far end of the Tomb it used to go back up to the Reliquary for one spot and down again for the next.)
      const far = (p) => dist(m.x, m.z, p[0], p[1]) + (j.below ? Math.abs((floorAt(p[0], p[1]) ?? m.y) - m.y) * 8 : 0);
      this.patrol = j.roam ? from[Math.floor(Math.random() * from.length)] : from.reduce((a, b) => (far(a) <= far(b) ? a : b));
      this.patrolT = 0;
    }
    const [px, pz] = this.patrol;
    if (dist(m.x, m.z, px, pz) < 4) {
      // A look round, and on to the next.
      this.halt();
      this.face = this.o.input.yaw + 0.9;
      if ((this.patrolT += 0.12) > 4) {
        (this.lastSpots ||= []).push(`${px},${pz}`);
        if (this.lastSpots.length > Math.max(1, j.spots.length - 1)) this.lastSpots.shift();
        this.patrol = null;
        // Every spot looked round and not a fight since the round began: there's nobody left here for now. Down in the
        // catacombs each place's dead come the once till it's been away a while (src/sim/undead.js), a jelly camp fills
        // again ten minutes after it's wiped (src/sim/slimes.js), and a lair in its own time. It leaves that work for a
        // while and does something else. (It used to go round and round the Bell Crypt and the Reliquary for as long
        // as it was watched, with twenty more to put down for the Sexton and nobody there; and to stand at the
        // millpond ten minutes, five jellies down of the miller's eight, till the pond filled.)
        if (j.dries || j.why.startsWith('q:')) {
          const R = this.dryRun && this.dryRun.why === j.why && (this.foughtT ?? -99) < this.dryRun.t ? this.dryRun : (this.dryRun = { why: j.why, t: this.t, seen: new Set() });
          R.seen.add(`${px},${pz}`);
          // (And most of a minute of looking at the least: a hunt with one spot has seen it all at the first look, and
          // a lair it has just come to may not have its bodies up yet. src/sim/tripo.js loads them as it wakes.)
          if (this.t - R.t > DRY_LOOK && spots.every(([x, z]) => R.seen.has(`${x},${z}`))) {
            this.dryRun = null; this.lastSpots = [];
            if (j.dries) { this.giveUp('dry:catacombs', DRY_FOR); this.o.note?.('Auto-play: nobody left in the catacombs. Other work, till they rise again.'); }
            else { this.giveUp(j.why, HUNT_DRY_FOR); this.o.note?.('Auto-play: nothing left to hunt here for now. Other work meanwhile.'); }
            this.job = null; this.jobKey = '';
          }
        }
      }
      return;
    }
    this.goTo(px, pz, 2.5, true, false, !!j.below);
    void foes;
  }

  // Up to someone in the town, face to face, and a word.
  approach(m, j) {
    const { townUI, game } = this.o;
    const w = townUI.whereOf(j.who);
    this.say(j.say);
    if (!w || !this.reachable(j.who)) { this.giveUp(`p:${j.who}`, 60); this.job = null; return; }
    const d = dist(m.x, m.z, w.x, w.z), dy = Math.abs((w.y ?? m.y) - m.y);
    // (Upstairs, or somewhere it can't get to: later. The 75 s run from when it last got nearer, not from when it set
    // out: counted from the start, nobody more than a minute's walk off was ever reached. Ser Hale is 2.4 km from the
    // square; it gave him up 600 m down the road, turned back to grind, and set out again, for as long as it was watched.)
    if (!j.since || d < (j.best ?? Infinity) - 2) { j.since = this.t; j.best = d; }
    // (Someone down a delve it isn't down: by that delve's portal, or the gate to it from the one it's in, and then on to them.)
    const there = delveAt(w.x, w.z), here = delveOf(m.x, m.z);
    if (there && here?.key !== there) {
      const at = delveWay(here, delveByKey(there), this.gateOpen);
      j.wayT ??= this.t; j.since = this.t;
      if (!at || this.t - j.wayT > 900) { this.giveUp(`p:${j.who}`, 240); this.job = null; return; }
      this.goTo(at[0], at[1], 0.4, true);
      return;
    }
    if (this.t - j.since > 75) { this.giveUp(`p:${j.who}`, 240); this.job = null; return; }
    // Face to face, and nothing between them: no wall, no shut door. (A quest isn't taken or handed in from the street
    // through the side of a house: it goes in at the door.)
    // (Near enough: a couple of strides, or as far as the game itself would take a word from: over a stall's counter.)
    const near = (d < 2.1 || game.nearFolk?.i === j.who) && (dy < 1.3 || w.beyond);
    const reach = near ? this.within(m, `p:${j.who}`, w.x, (w.beyond ? m.y : w.y ?? m.y) + 1.2, w.z) : false;
    if (near && reach !== false) {
      this.halt();
      this.face = Math.atan2(w.x - m.x, w.z - m.z);
      if (w.busy === 12 || w.busy === 13) { this.giveUp(`p:${j.who}`, 30); this.job = null; return; }
      if (reach && Math.abs(wrap(this.face - this.o.input.yaw)) < 0.35 && (this.talkWait = (this.talkWait || 0) + 0.12) > 0.5) {
        this.talkWait = 0;
        if (game.nearFolk?.i === j.who) game.takeNearest(); else townUI.talk(j.who);
        if (townUI.open) this.talk = { who: j.who, why: j.why, n: 0, t: 0, shopped: false, sold: 0 };
      }
      return;
    }
    this.face = null;
    // (Close, with a wall between: on round to them, as near as a body can stand.)
    this.goTo(w.x, w.z, near ? 0.5 : 1.4, d > 12, true, false, (w.beyond ? m.y : w.y ?? m.y) + 1.2);
    // (No way to them at all: upstairs, shut in. Later.)
    if (this.noWay) { this.noWay = null; this.giveUp(`p:${j.who}`, 240); this.job = null; }
  }

  // The talk panel: through the quest's lines, its offers taken, then the counter if that's what it came for.
  converse(dt, m) {
    const { townUI, pack } = this.o, T = this.talk;
    if (!T) { if ((this.loneT = (this.loneT || 0) + dt) > 4) { this.loneT = 0; townUI.close(true); } return; }
    // (Talking with them is no stall: approach gives someone up 75 s after it last got nearer, and a long talk, Wenna's door
    // and her three offers one after another, ran past that. She was given up for four minutes with two quests to hand in.)
    if (this.job?.who === T.who) this.job.since = this.t;
    T.t -= dt;
    if (T.t > 0) return;
    // A line it hasn't seen before is left up to be read (by whoever's watching: Settings' Talk in auto-play), then answered;
    // at a counter, only a moment.
    const line = townUI.view?.line || '';
    if (this.o.settings?.autoread !== 'off' && line && line !== T.seen) {
      T.seen = line;
      T.t = townUI.mode === 'shop' ? 0.9 : readTime(line);
      this.o.event?.('line', { who: T.who, line });
      return;
    }
    T.t = 0.75 + Math.random() * 0.4;
    if (++T.n > 40) { townUI.close(true); this.giveUp(`p:${T.who}`, 120); return; }
    const opts = townUI.view?.opts || [];
    const label = (o) => o.label;
    const at = (f) => opts.findIndex((o) => o.cls !== 'dim' && f(o));
    const id = townUI.people[T.who]?.id;
    // On through what's being said.
    // (And through Lisandra's door, once a quest's opened it: src/ui/folk.js lisDoor.)
    let k = at((o) => ['Go on.', '...', 'To bed.', DOOR_STEP].includes(label(o)));
    // Yes to an offer.
    if (k < 0) k = at((o) => Object.values(QUESTS).some((q) => q.accept === label(o)));
    // The quest talk it came for, or anything else this person has for it.
    if (k < 0) {
      const want = this.wanted(id), Q = townUI.quests;
      // (Not an offer of something you've lately dropped from the quest log: wanted() leaves those out, and so does this.)
      const rested = new Set(Object.keys(RULES).filter((qid) => Q.droppedLately?.(qid, DROP_REST)).map((qid) => QUESTS[qid].title));
      k = at((o) => want.has(label(o)) || (o.cls === 'offer' && !rested.has(label(o))));
    }
    if (k >= 0) { townUI.choose(k); return; }
    // Wes Harrow letting the pack out: asked, then a pocket at a time while it's still worth the coin (wantsRoom).
    if (T.why === 'room') {
      const one = at((o) => label(o).startsWith(ONE_MORE));
      if (one >= 0 && T.sold < 6 && this.wantsRoom()) { T.sold++; townUI.choose(one); return; }
      const ask = at((o) => label(o) === LET_OUT);
      if (ask >= 0 && !T.asked && this.wantsRoom()) { T.asked = true; townUI.choose(ask); return; }
      townUI.close(true);
      this.giveUp('room', 300);
      return;
    }
    // The counter.
    if (T.why === 'sell' || T.why === 'mend' || T.why === 'bed' || T.why === 'buy') {
      const p = townUI.people[T.who], trade = TRADES[p.trade];
      if (townUI.mode !== 'shop') {
        if (T.shopped) { townUI.close(true); return; }
        const s = at((o) => label(o) === trade?.label);
        if (s < 0) { townUI.close(true); this.giveUp(`p:${T.who}`, 120); return; }
        T.shopped = true;
        townUI.choose(s);
        if (townUI.mode !== 'shop') this.giveUp(`p:${T.who}`, 300);
        return;
      }
      if (T.why === 'sell') {
        const e = this.junk().find((q) => offerFor(p.trade, q.item) > 0);
        if (e && T.sold < 30) { T.sold++; townUI.sell(e, offerFor(p.trade, e.item)); return; }
        // (And what the party carry that nobody would be the better for: src/ui/party.js bagJunk.)
        const b = this.o.game.party?.bagJunk?.().find((q) => offerFor(p.trade, q.item) > 0);
        if (b && T.sold < 30) { T.sold++; townUI.sellBag(b, offerFor(p.trade, b.item)); return; }
        // The satchel's bone, what no quest still wants.
        const keep = Object.keys(RULES).some((qid) => townUI.quests.state(qid)?.stage !== 'done' && RULES[qid].steps.some((s) => s.bring === 'bone'));
        if (trade.buysMats?.bone && !keep && (pack.mats.bone || 0) > 0) { townUI.sellMat('bone', trade.buysMats.bone); return; }
      } else if (T.why === 'mend' && !T.done) { T.done = true; townUI.buyGood('dressing'); return; }
      else if (T.why === 'buy' && !T.done) {
        T.done = true;
        const items = townUI.stockOf(p.trade), k = items.indexOf(this.job?.item);
        if (k >= 0) townUI.buyItem(k, (items[k].type === 'spell' ? 120 : worth(items[k])) * 10);
        this.giveUp(`buy:${T.who}`, 120);
        return;
      }
      else if (T.why === 'bed' && !T.done) {
        T.done = true;
        townUI.buyGood('bed');
        if (!townUI.open) { this.hold = 5; this.giveUp('bed', 600); }
        return;
      }
      townUI.close(true);
      if (T.why === 'sell') this.giveUp(`sell:${T.who}`, 60);
      return;
    }
    townUI.close(true);
    // (Nothing more for it here for a while.)
    if (T.why === 'offer') this.giveUp(`p:${T.who}`, 20);
    void m;
  }

  // The lines it wants to say to this person now: steps, hand-ins, what's ready, offers.
  wanted(id) {
    const { townUI, pack } = this.o, Q = townUI.quests, out = new Set();
    for (const qid of Object.keys(RULES)) {
      const s = Q.state(qid), st = Q.step(qid), q = QUESTS[qid];
      if (!s) { if (q.giver === id && !Q.droppedLately?.(qid, DROP_REST)) out.add(q.title); continue; }
      if (s.stage === 'done') continue;
      if (st?.talk === id) out.add(st.say);
      if (q.giver !== id) continue;
      if (s.stage === 'making' && this.o.town.day >= s.ready) out.add(`${q.title}: is it ready?`);
      if (st?.back) out.add(st.say || `${q.title}: it's done.`);
      if (st?.bring && (pack.mats[st.bring] || 0) >= st.n) out.add(`Here: ${st.n} ${matName(st.bring, st.n)}.`);
    }
    return out;
  }

  // ---- getting about

  // Walks to (x, z): by the nav worker's paths on its ground, by the roads and the seals beyond it.
  // touch: the height of something there it means to put a hand to or have a word with (a chest, someone): its path then
  // ends where there's nothing between it and that, or there's no way.
  goTo(x, z, near = 1, run = true, person = false, below = false, touch = null) {
    this.useGoal = true;
    const g = this.goal;
    // (The same errand only if it's the same place, or someone who's moved a little. Anything else within a few strides is
    // somewhere else: it used to keep walking to whoever stood outside a door when it meant the chest just inside it.)
    if (!g || dist(g.x, g.z, x, z) > (person ? 2.5 : 0.75) || !!g.person !== person || !!g.below !== below || (g.touch === null) !== (touch === null)) {
      this.goal = { x, z, near, run, t: this.t, below, touch, person };
      this.macro = null; this.sub = null; this.subFor = null; this.noWay = null;
    } else { g.near = near; g.run = run; g.touch = touch; g.x = x; g.z = z; }
  }

  walk(dt, m) {
    const g = this.goal;
    if (!g || !this.useGoal || this.fighting) return;
    const d = dist(m.x, m.z, g.x, g.z);
    if (d < g.near) { this.halt(); return; }
    // In the Test Dungeon: by its own field, the door as the sim last said (src/core/testhall.js HallNav).
    if (inHall(m.x, m.z) && inHall(g.x, g.z)) {
      const [ux, uz] = (this.hallNav ||= new HallNav()).flow([0, 0], m.x, m.z, g.x, g.z, this.t);
      this.steer(ux, uz, g.run && d > 6);
      this.look = null;
      return;
    }
    // In the Warrens: by their own field (src/ui/autowarrens.js caveStep), at a run between the rooms.
    if (inDungeon(m.x, m.z) && inDungeon(g.x, g.z)) {
      const [ux, uz] = caveStep(this, m, g);
      this.steer(ux, uz, g.run && d > 6);
      this.look = null;
      return;
    }
    // The way: on the grid both ends, a path; otherwise the long way round by the roads. (Used up short of it, as when someone it's
    // walking up to has moved on: worked out again.)
    if (!this.macro || !this.macro.length) { this.macro = this.longWay(m, g); this.legFrom = { x: m.x, z: m.z }; this.wayT = this.t; this.sub = null; this.subFor = null; this.loc = null; this.pre = null; }
    let W = this.macro[0];
    // Dragged well off its road (a fight, a run from one): the way worked out again from here, to the nearest road, not back
    // across country to where it left it.
    const F = this.legFrom;
    if (W?.road && F?.road && this.t - this.wayT > 4 && segNear(F.x, F.z, W.x, W.z, m.x, m.z) > 40) { this.macro = null; return; }
    // At each point once it's within its reach (a point down a road, ON; the steps' tighter, so it's square on to them), or
    // has gone on past it the way it came.
    const reach = (q) => (q === this.macro.at(-1) ? g.near : q.r ?? 3.5);
    const past = (q) => !q.stair && q !== this.macro.at(-1) && F && dist(m.x, m.z, q.x, q.z) < 6 && (m.x - q.x) * (q.x - F.x) + (m.z - q.z) * (q.z - F.z) > 0;
    while (W && !W.seal && (dist(m.x, m.z, W.x, W.z) < reach(W) || past(W))) { this.legFrom = this.macro.shift(); this.sub = null; W = this.macro[0]; }
    if (!W) { this.halt(); return; }
    if (W.seal) {
      if (dist(m.x, m.z, W.x, W.z) < 2.2) { this.useSeal(W); return; }
    }
    let tx = W.x, tz = W.z;
    // Leaving the nav ground for somewhere past it: a path to its edge on the way, then on across country.
    let edge = null;
    if (this.nav.inGrid(m.x, m.z, m.below) && !this.nav.inGrid(W.x, W.z, !!W.below)) {
      const L = dist(m.x, m.z, W.x, W.z);
      for (let s = 0; s <= L; s += 4) {
        const x = m.x + (W.x - m.x) * s / L, z = m.z + (W.z - m.z) * s / L;
        if (!this.nav.inGrid(x, z, m.below) || Math.abs(x) > 236 || Math.abs(z) > 236) break;
        edge = { x, z };
      }
      if (edge && dist(m.x, m.z, edge.x, edge.z) < 6) edge = null;
      if (edge && this.subFor && this.subFor.edgeOf === W && dist(this.subFor.x, this.subFor.z, edge.x, edge.z) < 30) edge = this.subFor;
      else if (edge) edge.edgeOf = W;
    }
    const leg = edge || W;
    if (this.nav.inGrid(m.x, m.z, m.below) && this.nav.inGrid(leg.x, leg.z, edge ? m.below : !!W.below)) {
      // A fresh path when the leg changes, when what it's walking to has moved, and now and then anyway. The one it has is
      // kept till the new one's in, and with none yet it stands and waits for it (a moment): it never walks straight at
      // where it's going, which is how it used to end up against a wall.
      let fresh = this.subFor !== leg;
      // (The next point's path asked for as it came up to this one, so it walks on down the road without stopping to wait.)
      const pre = this.pre;
      if (fresh && pre?.for === leg && pre.pts?.length) { this.sub = pre.pts; this.subFor = leg; this.subT = this.t; this.subTo = [leg.x, leg.z]; this.pre = null; this.noWay = null; fresh = false; }
      if (fresh) { this.sub = null; this.noWay = null; }
      if (!this.subAsk && this.nav.ready && (fresh || this.t - this.subT > 12 || (this.subTo && dist(this.subTo[0], this.subTo[1], leg.x, leg.z) > 2.5))) {
        this.subFor = leg; this.subT = this.t; this.subTo = [leg.x, leg.z]; this.subAsk = true;
        const want = leg, avoid = this.avoid(this.me(this.o.game.currentSnap()), true).concat(this.lockedDoors());
        this.nav.ask('path', { from: [m.x, m.z], to: [leg.x, leg.z], avoid, touch: leg === g ? g.touch : null, polite: true }).then((pts) => {
          this.subAsk = false;
          if (this.subFor !== want) return;
          this.subT = this.t;
          // (No way there: said so, for whoever sent it to leave it be. walk() below, and loot() and approach().)
          if (pts?.length) { this.sub = pts; this.noWay = null; } else { this.sub = null; this.noWay = { t: this.t }; }
        });
      }
      if (this.noWay) {
        this.halt();
        // (No way to a point down a road: on to the next, once. Again from where it stands, or no way to where it's going, it's
        // lost: wedged, it finds its way out of the corner once it's been lost there twice.)
        if (this.t - this.noWay.t > 0.6) {
          this.noWay = null;
          const S = this.skipAt, again = S && dist(S.x, S.z, m.x, m.z) < 1.5 && this.t - S.t < 5;
          if (W.road && W !== this.macro.at(-1) && !again) { this.skipAt = { x: m.x, z: m.z, t: this.t }; this.legFrom = this.macro.shift(); this.sub = null; } else this.lost();
        }
        return;
      }
      const P = this.sub;
      if (!P) {
        // (No path yet. If the nav thread never comes up at all, straight on as it used to go.)
        if (!this.nav.ready && this.t > 12) { if (!this.door(dt, m, leg.x - m.x, leg.z - m.z)) this.steer(leg.x - m.x, leg.z - m.z, false); } else this.halt();
        return;
      }
      // On to the next point once it's at this one, or has gone by it: not from a stride short of it, since the way on from
      // a corner is only clear from the corner. The two places either side of a doorway it stands on, each in turn.
      while (P.length > 1) {
        const [qx, qz, , door] = P[0], k = dist(m.x, m.z, qx, qz);
        const gone = (m.x - qx) * (P[1][0] - qx) + (m.z - qz) * (P[1][1] - qz) > 0;
        if (k < (door >= 0 ? 0.3 : 0.4) || (gone && k < 0.8 && !(door >= 0))) P.shift(); else break;
      }
      [tx, tz] = P[0];
      const k = dist(m.x, m.z, tx, tz);
      // Someone standing on the very place it's making for (one of the townsfolk just inside their door: they're stepped
      // round, not walked through): pushing at it and getting no nearer, it goes on past, as you'd go round them.
      const on = this.wayPoint;
      if (!on || on.q !== P[0]) this.wayPoint = { q: P[0], best: k, stall: 0 };
      else if (k < on.best - 0.04) { on.best = k; on.stall = 0; }
      else if ((this.auto.mx || this.auto.mz) && k < 1.3 && (on.stall += dt) > 0.45) {
        this.wayPoint = null;
        if (P.length > 1) { P.shift(); [tx, tz] = P[0]; } else { this.halt(); return; }
      }
      // At the end of it, and no nearer to be got (whoever it came for is over a counter; that's as near as the wall allows): it stands.
      if (P.length === 1 && k < 0.3) { this.halt(); return; }
      // The doors on its way (the next few points say which): opened as it comes to them, and no others it passes.
      const doors = new Set();
      for (let q = 0; q < Math.min(3, P.length); q++) if (P[q][3] >= 0) doors.add(P[q][3]);
      if (this.door(dt, m, tx - m.x, tz - m.z, doors)) return;
      // A run where the way's long and straight; a walk by a wall, through a door, and coming up to a corner (a run takes a
      // corner wide, into the far wall).
      let run = g.run && d > 8 && !W.walk && !(W.stair && dist(m.x, m.z, W.x, W.z) < 6);
      if (run && k < 5) {
        if (P[0][2]) run = false;
        else if (P.length > 1 && Math.abs(wrap(Math.atan2(P[1][0] - tx, P[1][1] - tz) - Math.atan2(tx - m.x, tz - m.z))) > 0.6) run = false;
      }
      // (Its eyes on the way it's going: not left on the door it just opened, or on whoever it's to talk to next. With an
      // errand to talk to someone in hand the motor keeps where it's looking, and it stood at a door for ever, unable to
      // turn from it to walk through.)
      this.face = null;
      this.steer(tx - m.x, tz - m.z, run);
      this.lookOn(m, P, run);
      if (!m.town) { const L = dist(m.x, m.z, W.x, W.z) || 1; this.board(dt, m, (W.x - m.x) / L, (W.z - m.z) / L, W.stair ? 0 : d, (q) => this.alongWay(m, q)); }
      // Coming up to this point with another after it on the nav ground: that one's path, from this one.
      const N = this.macro[1];
      if (!edge && N && !N.seal && !this.preAsk && this.pre?.for !== N && dist(m.x, m.z, W.x, W.z) < 10 && this.nav.inGrid(W.x, W.z, !!W.below) && this.nav.inGrid(N.x, N.z, !!N.below)) {
        const ask = this.pre = { for: N, pts: null };
        this.preAsk = true;
        this.nav.ask('path', { from: [W.x, W.z], to: [N.x, N.z], avoid: this.avoid(m, true).concat(this.lockedDoors()), touch: N === g ? g.touch : null, polite: true }).then((pts) => { this.preAsk = false; ask.pts = pts; });
      }
    } else if (inEast(m.x, m.z) && inEast(W.x, W.z) && !m.below && this.eastWalk(dt, m, W, g, d)) {
      // (In City State Phobos and Castle Velscour: by the east's own map, eastWalk below.)
    } else {
      // Across country: a stretch at a time, by a short path round whatever stands in the way (a wall, a light well, a stand of
      // pines), worked out on the nav thread; till it comes, straight on, stepping round what the probe finds.
      let hx = tx - m.x, hz = tz - m.z;
      const L = Math.hypot(hx, hz) || 1;
      hx /= L; hz /= L;
      // Walking, and no nearer for half a minute: it's going to and fro before something (unstick() only knows standing
      // still). Left, as anything it can't get to is. (On the hill over the catacombs it paced six minutes this way,
      // turned back and forth by walls buried under it, till it was stopped: src/sim/world.js `under`.)
      const pr = this.progress;
      // (Half a minute of walking: a fight or a word on the way isn't counted.)
      if (!pr || pr.leg !== W || L < pr.best - 6) this.progress = { leg: W, best: L, walked: 0 };
      else if ((pr.walked += dt) > 30) { this.progress = null; this.lost(); return; }
      const sx = hx, sz = hz, far = Math.min(L, 45), aim = [m.x + hx * far, m.z + hz * far];
      const lp = this.loc;
      if (!lp || (!lp.pending && (lp.leg !== W || this.t - lp.t > 6 || dist(m.x, m.z, lp.to[0], lp.to[1]) < 5))) {
        const ask = this.loc = { leg: W, t: this.t, to: aim, pts: lp?.leg === W ? lp.pts : null, pending: true };
        this.nav.ask('local', { from: [m.x, m.z], to: aim }).then((pts) => { if (this.loc === ask) { ask.pending = false; ask.pts = pts; ask.t = this.t; } });
      }
      const pts = this.loc?.pts;
      while (pts && pts.length > 1 && dist(m.x, m.z, pts[0][0], pts[0][1]) < 1.2) pts.shift();
      if (pts?.length && dist(m.x, m.z, pts[0][0], pts[0][1]) > 0.5) {
        const k = dist(m.x, m.z, pts[0][0], pts[0][1]);
        hx = (pts[0][0] - m.x) / k; hz = (pts[0][1] - m.z) / k;
      } else {
        if ((this.probeT -= dt) <= 0) {
          this.probeT = 0.25;
          this.nav.ask('probe', { x: m.x, z: m.z, y: m.y + 0.2, hx, hz, look: 5 }).then((r) => { this.probeDir = r; });
        }
        if (this.probeDir && this.probeDir[2] > 0.5) { hx = this.probeDir[0]; hz = this.probeDir[1]; }
      }
      if (this.door(dt, m, hx, hz)) return;
      this.face = null;
      // (A walk up a delve's steps, and coming up to them: square on, not in at a run.)
      const run = g.run && d > 8 && !W.walk && !(W.stair && L < 6);
      this.steer(hx, hz, run);
      if (pts?.length) this.lookOn(m, pts, run);
      this.board(dt, m, sx, sz, W.stair ? 0 : d, (q) => this.alongWay(m, q));
    }
  }

  // In City State Phobos and Castle Velscour, to W: by the east's own walking map (src/sim/east-nav.js), over its streets,
  // up its stairs and along its decks and bridges, one over another, as the nav thread walks it out a few tens of metres at a
  // time; its doors opened on the way (phDoor). False till the first way's in (it goes on across country meanwhile). With
  // no way there three times running, it's lost: whatever it was after is left.
  eastWalk(dt, m, W, g, d) {
    const E = this.eastWay, P0 = E?.leg === W ? E.pts : null;
    // (No nearer for half a minute of walking: lost, as across country. Nearer down its way, with one: a tower's stair winds
    // round and round under the deck it's going to, no nearer as the crow flies for a long while.)
    let L = dist(m.x, m.z, W.x, W.z);
    if (P0?.length) { let x = m.x, y = m.y, z = m.z; L = 0; for (const p of P0) { L += dist(x, z, p[0], p[1]) + Math.abs((p[4] ?? y) - y); x = p[0]; z = p[1]; y = p[4] ?? y; } L += dist(x, z, W.x, W.z); }
    const pr = this.progress;
    if (pr?.leg === W && pr.fresh) { pr.fresh = false; pr.best = Math.max(pr.best, L); }
    if (!pr || pr.leg !== W || L < pr.best - 6) this.progress = { leg: W, best: L, walked: 0 };
    else if ((pr.walked += dt) > 30) { this.progress = null; this.eastWay = null; this.lost(); return true; }
    // (How much of the way it has is walked out: the points before the first of the long way's.)
    let left = 0;
    if (P0) { let x = m.x, z = m.z; for (const p of P0) { if (p[2] === 2) break; left += dist(x, z, p[0], p[1]); x = p[0]; z = p[1]; } }
    if (!E?.pending && (!P0 || this.t - E.t > 7 || (left < 14 && P0.some((p) => p[2] === 2)) || dist(W.x, W.z, E.to[0], E.to[1]) > 2.5)) {
      const last = W === this.macro.at(-1), r = Math.max(0.5, (last ? g.near : W.r ?? 3.5) - 0.3);
      const ask = this.eastWay = { leg: W, t: this.t, to: [W.x, W.z], pts: P0, pending: true };
      this.nav.ask('east', { from: [m.x, m.y, m.z], to: [W.x, W.z, W.y ?? null], r }).then((pts) => {
        if (this.eastWay !== ask) return;
        ask.pending = false; ask.t = this.t;
        // (A fresh way, walked out further than the last was, is longer than the line it was guessed by: nearer from there.)
        if (pts?.length) { ask.pts = pts; this.eastMiss = 0; if (this.progress?.leg === W) this.progress.fresh = true; } else { ask.pts = null; this.eastMiss = (this.eastMiss || 0) + 1; }
      });
    }
    const P = this.eastWay?.leg === W ? this.eastWay.pts : null;
    if (!P) {
      if ((this.eastMiss || 0) >= 3) { this.eastMiss = 0; this.eastWay = null; this.say('No way there from here.'); this.lost(); return true; }
      return false;
    }
    // On to the next point once it's at it (at its height: a bridge over the street isn't the street), or has gone by it; a point
    // of the long way's, not walked out yet, once it's near.
    while (P.length > 1) {
      // (At its height: within a hand of it, or a metre once it's all but stood on it. Within two metres, as it was, a stair's
      // foot was ticked off from the ground before its first tread, and it turned up the flight from under it: in under the
      // stair, and there for good. tools/paths/trips.mjs.)
      const q = P[0], k = dist(m.x, m.z, q[0], q[1]), dy = Math.abs((q[4] ?? m.y) - m.y), level = dy < (k < 0.2 ? 0.6 : 0.3);
      const gone = (m.x - q[0]) * (P[1][0] - q[0]) + (m.z - q[1]) * (P[1][1] - q[1]) > 0;
      if ((level && (k < 0.5 || (gone && k < 0.8))) || (q[2] === 2 && k < 3)) P.shift(); else break;
    }
    const [tx, tz] = P[0], k = dist(m.x, m.z, tx, tz);
    if (P.length === 1 && k < 0.35) { this.halt(); return true; }
    if (this.phDoor(dt, m, P)) return true;
    // (A run down a long straight; a walk round a bend, on a stair, at a door.)
    let run = g.run && d > 8 && !W.walk;
    if (run && k < 4 && P.length > 1 && Math.abs(wrap(Math.atan2(P[1][0] - tx, P[1][1] - tz) - Math.atan2(tx - m.x, tz - m.z))) > 0.6) run = false;
    if (run && Math.abs((P[0][4] ?? m.y) - m.y) > 1.5 && k < 6) run = false;
    this.face = null;
    this.steer(tx - m.x, tz - m.z, run);
    this.lookOn(m, P, run);
    return true;
  }

  // A shut Phobos door on its way (src/items/phobos-doors.js): one its next few points go through. Opened, as E opens it, and a
  // moment given it to swing. True while it's busy with one.
  phDoor(dt, m, P) {
    const D = this.o.game.phDoors;
    if (!D) return false;
    if (this.phDoorWait > 0) { this.phDoorWait -= dt; this.halt(); return true; }
    const seg = [[m.x, m.z]].concat(P.slice(0, 3).map((p) => [p[0], p[1]]));
    for (const dr of D.doorsNear(m.x, m.z, 3.2)) {
      if (D.open.has(dr.id) || Math.abs(dr.fy - m.y) > 1.8 || dist(m.x, m.z, dr.cx, dr.cz) > 3) continue;
      let on = false;
      for (let i = 0; i + 1 < seg.length && !on; i++) if (segNear(seg[i][0], seg[i][1], seg[i + 1][0], seg[i + 1][1], dr.cx, dr.cz) < 0.9) on = true;
      if (!on) continue;
      D.toggle(dr);
      this.say('Opening a door.');
      this.phDoorWait = 0.55;
      this.halt();
      return true;
    }
    return false;
  }

  // The point k metres on down its way from where it stands: to the next point it's walking to, and on past it. (For the
  // shield: a road falls along itself, not along the line to the next bend.)
  alongWay(m, k) {
    let x = m.x, z = m.z;
    for (const p of this.macro || []) {
      if (p.seal) break;
      const L = dist(x, z, p.x, p.z);
      if (L >= k) return [x + (p.x - x) * k / L, z + (p.z - z) * k / L];
      k -= L; x = p.x; z = p.z;
    }
    return [x, z];
  }

  // A shut door on its way (a house's, the Sexton's): it stops, turns to face it, opens it as E does, and gives it a moment to
  // swing before it goes on. True while it's busy with one. (A locked one it leaves: its path shouldn't need it.)
  // ids: the doorways its path goes through (the nav thread's points say), so it doesn't open every door it walks past.
  door(dt, m, hx, hz, ids = null) {
    const g = this.o.game;
    if (this.doorWait > 0) { this.doorWait -= dt; this.want = null; return true; }
    const L = Math.hypot(hx, hz) || 1;
    let best = null, bd = 2.8;
    for (const d of g.doors.doors) {
      if (d.open || Math.abs(d.y - m.y) > 2.2 || g.locked(d) || (ids && !ids.has(d.id))) continue;
      const dx = d.cx - m.x, dz = d.cz - m.z, k = Math.hypot(dx, dz);
      if (k > bd || k > d.reach + 0.8) continue;
      // (Ahead of it on its way, or right at it.)
      if (k > 1.3 && (dx * hx + dz * hz) / (k * L) < 0.5) continue;
      bd = k; best = d;
    }
    if (!best) return false;
    this.face = Math.atan2(best.cx - m.x, best.cz - m.z);
    this.want = null;
    this.say('Opening a door.');
    if (g.nearDoor === best) { g.doors.toggle(best); this.doorWait = 0.7; }
    else if (bd > best.reach - 0.3) this.steer(best.cx - m.x, best.cz - m.z, false);
    return true;
  }

  // The long way (planWay): straight there on the nav ground when it's near; else to the nearest road, down the roads and
  // off them where they're nearest to where it's going, by the seals when that's shorter, kept off the lairs and posts it
  // isn't ready for; and up a delve's steps to its portal.
  longWay(m, g) {
    const lands = this.o.lands;
    return planWay(m, g, { seals: SEALS.filter((s) => lands.awake.has(s.key)), avoid: this.avoid(m, true), grid: (x, z, b) => this.nav.inGrid(x, z, b), below: m.below });
  }

  useSeal(W) {
    const { lands } = this.o;
    this.halt();
    this.say(`Through the seal to ${W.to.name}.`);
    if (!lands.isOpen && lands.nearSeal) { lands.use(); this.sealT = this.t; this.sealTo = W.to; return; }
    if (!lands.nearSeal) {
      // (On it but not quite: a step closer.)
      const m = this.me(this.o.game.currentSnap());
      this.steer(W.x - m.x, W.z - m.z, false);
    }
  }

  // The seal's list is up: the one it came for.
  travelling() {
    const { lands } = this.o;
    if (this.t - this.sealT < 1.2) return;
    if (this.sealTo) { const s = this.sealTo; this.sealTo = null; lands.go(s); this.macro = null; this.sub = null; return; }
    lands.close();
  }

  // ---- the black knight

  // Velscour's knight on the cathedral's steps (sim.knights[0]: src/sim/sim.worker.js BLACK), as the snapshot has him, or null
  // once he's down.
  blackKnight(snap) {
    if (!snap) return null;
    const o = CHARS_START;
    if (snap[o + C.ACTIVE] < 0.5 || (snap[o + C.KIND] | 0) !== 0 || snap[o + C.STATE] === 10 || snap[o + C.HP] <= 0) return null;
    return { x: snap[o + C.X], y: snap[o + C.Y], z: snap[o + C.Z], yaw: snap[o + C.YAW], hp: snap[o + C.HP], maxHp: snap[o + C.MAX_HP], glint: snap[o + C.GLINT] };
  }

  // Putting him down, as a careful player does. He keeps his post: he won't chase past 20 m of it (26 once he's after you), and
  // he lets anyone in the town go. Nothing it casts reaches further than REACH, so it can't work on him from outside that: it
  // comes in on his flank to within its reach and works on him there: a Meteor (from above: his shield's no use), Firebolts
  // and Chain Lightning when he's turned from it. When he comes at it, it backs off shooting, out past his leash if he keeps
  // on, and as he walks back to his door it follows him in and has his back. Hurt, it falls back to the town.
  siege(snap, m) {
    const K = this.blackKnight(snap);
    if (!K) {
      if (this.siegeFor === this.jobT) { this.o.log?.boss('black', 'killed', m); this.o.note?.('Auto-play: the black knight is down.'); this.siegeFor = -1; }
      this.job = null;
      return;
    }
    if (this.siegeFor !== this.jobT) { this.siegeFor = this.jobT; this.o.log?.boss('black', 'try', m); }
    const P = BLACK_POST, fromPost = dist(m.x, m.z, P[0], P[1]), dk = dist(m.x, m.z, K.x, K.z), kOut = dist(K.x, K.z, P[0], P[1]);
    this.say(`The black knight: ${Math.round(K.hp)} of ${Math.round(K.maxHp)} left.`);
    // Done in by him: off to the town (he lets it go there) to mend, and back.
    if (m.hpf < 0.4) {
      this.fighting = true;
      this.steer(-m.x - (K.x - m.x) * 0.5, -m.z - (K.z - m.z) * 0.5, true);
      if (dk > 14 && m.mana >= 25 && this.castCool <= 0 && this.cast(SP.mend, 0.35)) this.castCool = 1.2;
      this.say('The black knight: falling back to mend.');
      return;
    }
    // Where to stand: his flank (north or south of his door, whichever's nearer), just past his reach.
    const side = m.z >= P[1] ? 1 : -1, stand = [P[0] - 4, P[1] + side * SIEGE_RING];
    const atRing = fromPost > BLACK_LEASH + 1;
    // Getting there, while he stands at his door.
    if (dk > 34 && dist(m.x, m.z, stand[0], stand[1]) > 3) { this.goTo(stand[0], stand[1], 2, true); return; }
    this.fighting = true;
    // His aim: what it throws leads him; how he stands says whether his shield is in the way.
    const vx = (K.x - (this.kPrev?.[0] ?? K.x)) / 0.12, vz = (K.z - (this.kPrev?.[1] ?? K.z)) / 0.12;
    this.kPrev = [K.x, K.z];
    const tt = dk / 34, ax = K.x + vx * tt, az = K.z + vz * tt;
    if ((this.wobbleT -= 0.12) <= 0) { this.wobbleT = 0.5 + Math.random() * 0.5; this.wobble = (Math.random() - 0.5) * 0.03; }
    const yaw = Math.atan2(ax - m.x, az - m.z) + this.wobble;
    this.face = yaw;
    this.pitch = Math.atan2(K.y + 1.3 - (m.y + 1.62), Math.max(1, dk));
    this.aim = { x: ax, z: az, y: K.y + 1.3, w: this.wobble };
    const facing = Math.cos(wrap(Math.atan2(m.x - K.x, m.z - K.z) - K.yaw)) > 0.35;   // his front (and his shield) toward it
    // (A clean line to him: the cathedral's piers and the corners of its steps stop a bolt as surely as his board does.)
    const mark = { id: 0, x: K.x, y: K.y, z: K.z, h: 1.3, d: dk };
    this.watch(m, [mark]);
    const sight = this.sees(mark);
    const aimed = this.clean(mark) && Math.abs(wrap(yaw - this.o.input.yaw)) < Math.max(0.03, Math.atan2(0.7, dk));
    // Footwork: never inside his blade's reach, never out of its own; back off what's coming; round him otherwise, a step at a time.
    let mx = 0, mz = 0;
    const ox = (m.x - P[0]) / (fromPost || 1), oz = (m.z - P[1]) / (fromPost || 1);
    if (dk < 5.5) { mx = (m.x - K.x) / (dk || 1) + ox * 0.6; mz = (m.z - K.z) / (dk || 1) + oz * 0.6; }
    else if (dk > IN - 1.5) { mx = (K.x - m.x) / (dk || 1); mz = (K.z - m.z) / (dk || 1); }
    else if (sight && !sight.clear && sight.step) { const sg = Math.sign(sight.step), fx = (K.x - m.x) / (dk || 1), fz = (K.z - m.z) / (dk || 1); mx = -fz * sg; mz = fx * sg; }
    else { if ((this.strafeT -= 0.12) <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = -this.strafe; } mx = -oz * this.strafe * 0.4; mz = ox * this.strafe * 0.4; }
    // Right on it: turn and run for it (he's slower than its sprint), then turn back.
    if (dk < 4 && this.kiteCool <= 0) {
      const away = [(m.x - K.x) / (dk || 1) + ox, (m.z - K.z) / (dk || 1) + oz], L = Math.hypot(away[0], away[1]) || 1;
      this.kite = { x: away[0] / L, z: away[1] / L, t: 1.4 };
      this.kiteCool = 2.5;
    }
    if (this.kite) {
      this.kite.t -= 0.12;
      this.face = Math.atan2(this.kite.x, this.kite.z);
      this.steer(this.kite.x, this.kite.z, true);
      if (this.kite.t <= 0) { this.kite = null; this.reactT = 0.3; }
      return;
    }
    this.kiteCool -= 0.12; this.reactT -= 0.12;
    this.steer(mx, mz, false, true);
    // A blade flash, close: a sidestep.
    if (K.glint > 0.08 && dk < 5 && this.dodgeCool <= 0) { this.dodgeCool = 1.4; this.o.shared.input[INPUT.DODGE] += 1; }
    this.dodgeCool -= 0.12;
    if (this.reactT > 0) return;
    // His shield stops what comes at his front: the sky (a Meteor, a Blizzard) doesn't care which way he faces.
    const still = Math.hypot(vx, vz) < 2.5;
    this.shoot(snap, m, { T: { ...K, maxHp: K.maxHp }, d: dk, dn: dk, n: 1, close: dk < 5.5 ? 1 : 0, near: dk < 9 ? 1 : 0, around: 1, aimed, hpf: m.hpf, left: K.hp, fast: !still, still, big: true, inLine: 1, coming: dk < 20, bladesUp: this.t - (this.bladesT ?? -99) < 20, shield: facing && kOut < 6 && atRing,
      fresh: false, frozen: false, pulled: false, held: false, party: false, healer: false });
  }

  // ---- the hands and feet

  // Move along (ux, uz) in the world. run: break into a run (forward only). strafe: keep facing where `face` says.
  steer(ux, uz, run, strafe = false) {
    const L = Math.hypot(ux, uz);
    this.look = null;
    if (L < 1e-4) { this.want = null; return; }
    this.want = { x: ux / L, z: uz / L, run, strafe };
  }

  // Where its eyes are while it walks: a few strides on along its way (more at a run), so it looks round a bend before its feet
  // get there, as you do.
  lookOn(m, pts, run) {
    const [x, z] = ahead(m.x, m.z, pts, run ? 6 : 4);
    this.look = dist(m.x, m.z, x, z) > 1.2 ? [x, z] : null;
  }

  motor(dt, m) {
    const inp = this.o.input, a = this.auto;
    const w = this.want;
    const fight = this.fighting, surf = m.surf;
    // Where to look: where it's aiming in a fight, at a door it's opening, at whoever it's talking to; otherwise the way it's
    // going, its eyes a few strides on along its path (round the bend before its feet), but never so far off its next step
    // that it would have to stop and turn.
    let yaw = this.face;
    // (In a fight its eyes are on a point in the world, where its mark will be: followed from where it stands this frame, so a
    // sidestep or a ride on the shield doesn't drag its aim off between one thought and the next.)
    const aim = fight && this.aim && yaw !== null && yaw !== undefined ? this.aim : null;
    // (In third person the X is the camera's, a step to his right: the look is turned that much, so the X is on the mark.)
    const lead = aim && this.snap[H.TP] > 0.5 ? thirdLead(this.snap[H.TP_SIDE], dist(m.x, m.z, aim.x, aim.z)) : 0;
    if (aim) { yaw = Math.atan2(aim.x - m.x, aim.z - m.z) + aim.w + lead; this.pitch = Math.atan2(aim.y - (m.y + 1.62), Math.max(1, dist(m.x, m.z, aim.x, aim.z))) + (this.t < (this.liftT ?? 0) ? this.lift : 0); }
    if (yaw === null || yaw === undefined) {
      yaw = w ? Math.atan2(w.x, w.z) : inp.yaw;
      if (w && this.look && !fight && !w.strafe) yaw += clamp(wrap(Math.atan2(this.look[0] - m.x, this.look[1] - m.z) - yaw), -0.5, 0.5);
    }
    // A hand on a mouse: it speeds into a turn and eases out of it, and no faster than a person sweeps the view (quicker in a
    // fight, slow and steady on a shield). Through Input.look, so the hands sway with it as they do for the mouse.
    const dy = wrap(yaw - inp.yaw);
    const vMax = fight ? 4.2 : surf ? 1.6 : 3, acc = fight ? 14 : surf ? 5 : 10;
    const want = Math.abs(dy) < 0.012 ? 0 : Math.max(-vMax, Math.min(vMax, dy * (fight ? 6.5 : 3.8)));
    this.yawV += Math.max(-acc * dt, Math.min(acc * dt, want - this.yawV));
    const pitch = clamp(fight || this.talk ? this.pitch : surf ? -0.12 : this.slope(m, inp.yaw), -1.1, 1.1);
    const dp = pitch - inp.pitch, pWant = Math.abs(dp) < 0.01 ? 0 : Math.max(-1.3, Math.min(1.3, dp * 4));
    this.pitchV += Math.max(-5 * dt, Math.min(5 * dt, pWant - this.pitchV));
    inp.look(-this.yawV * dt, -this.pitchV * dt);
    if (!fight && !this.talk) this.pitch = -0.06;
    if (!fight && this.job?.kind !== 'talk' && !(this.doorWait > 0)) this.face = null;
    // Wedged (lost() below): out by the way the nav thread found for it, a point at a time, whatever else it wants.
    if (this.escapePts) {
      const E = this.escapePts;
      while (E.length && dist(m.x, m.z, E[0][0], E[0][1]) < 0.12) E.shift();
      if (!E.length || this.t > this.escapeUntil) this.escapePts = null;
      else {
        const dx = E[0][0] - m.x, dz = E[0][1] - m.z, k = Math.hypot(dx, dz) || 1, c = Math.cos(inp.yaw), s = Math.sin(inp.yaw);
        a.mx = (-c * dx + s * dz) / k; a.mz = (s * dx + c * dz) / k; a.run = false;
        this.say('Wedged in a corner: working its way out.');
        return;
      }
    }
    if (!w) { a.mx = 0; a.mz = 0; a.run = false; this.unstick(dt, m, false); return; }
    // Into the keys' frame: strafe and forward, from where it's looking now (so it can walk one way while it turns).
    const c = Math.cos(inp.yaw), s = Math.sin(inp.yaw);
    let mx = -c * w.x + s * w.z, mz = s * w.x + c * w.z;
    // Walking as a person does (W and the mouse): it faces the way it's going and goes forward, with a touch of A or D to
    // keep to its line round a bend. Turned well away from its next step (a sharp corner, a new way to go), it slows, or
    // turns on the spot first. (In a fight, and on the shield, it moves while it turns: backing off, sidestepping, running
    // from something, carving.)
    if (!w.strafe && !fight && !surf) {
      const off = Math.abs(wrap(Math.atan2(w.x, w.z) - inp.yaw));
      if (off > 1.0) { mx = 0; mz = 0; } else if (off > 0.6) { mx *= 0.5; mz *= 0.5; }
      // (A turn on the spot takes a second at most. One that goes on is its look held somewhere else: let go.)
      this.turnT = off > 1.0 ? (this.turnT || 0) + dt : 0;
      if (this.turnT > 2) { this.face = null; this.look = null; }
    } else this.turnT = 0;
    const L = Math.max(1, Math.hypot(mx, mz));
    a.mx = mx / L; a.mz = mz / L;
    // (Shift held for the run while there's breath for it: let go when it's short, taken up again once it's back, so it
    // runs in long stretches and doesn't flicker between a run and a walk.)
    // (The run-up to a ride on the shield is a few strides: it takes it on whatever breath it has.)
    this.running = w.run && a.mz > 0.6 && m.stam > (this.running ? 10 : this.ride ? 12 : 38) && !(this.letPass > 0 && !surf);
    a.run = this.running;
    // Easing off to let one of the party by (letPassFor): on foot a walk (above); on the shield a heel dragged for a moment
    // now and then, straight back against the way it's going so it doesn't turn the board, while it's still going faster
    // than about three quarters of what it was when it began to (letPassV): down a steep pitch, more of the time.
    const sp = Math.hypot(m.vx, m.vz);
    if (this.letPass > 0 && surf && sp > Math.max(5, (this.letPassV || 0) * 0.72) && (this.t * 1.4) % 1 < (sp > (this.letPassV || 0) ? 0.6 : 0.4)) {
      const bx = -m.vx / sp, bz = -m.vz / sp; a.mx = -c * bx + s * bz; a.mz = s * bx + c * bz;
    }
    // (Turning on the spot before a step isn't being stuck: only wanting to go and not going is.)
    this.unstick(dt, m, !surf && (a.mx !== 0 || a.mz !== 0 || this.turnT > 2.5));
    if (this.stuck.act > 0) {
      this.stuck.actT -= dt;
      const sd = this.stuck.side;
      if (this.stuck.act === 2) { a.mx = sd; a.mz = 0.3; }
      if (this.stuck.act === 3) { a.mx = sd * 0.4; a.mz = -1; }
      if (this.stuck.actT <= 0) this.stuck.act = 0;
    }
  }

  // How it holds its eyes, walking: a little down, at the ground a few strides on, and up or down a hill with the slope (not
  // indoors, nor below, where the floor is its own).
  slope(m, yaw) {
    if (this.t - (this.slopeT ?? -1) < 0.2) return this.slopeP;
    this.slopeT = this.t;
    const h0 = terrainHeight(m.x, m.z);
    if (m.below || Math.abs(m.y - h0) > 0.6) return (this.slopeP = -0.06);
    const h = terrainHeight(m.x + Math.sin(yaw) * 8, m.z + Math.cos(yaw) * 8) - h0;
    return (this.slopeP = clamp(Math.atan2(h, 8) * 0.6 - 0.07, -0.3, 0.22));
  }

  // The shield under its feet, down a long slope: a run, a jump, Space held, and it carves along the way it's going (the move
  // keys steer it as they do yours). Off again where the ground levels out and it's slowing, near where it's going, or in a fight.
  // (along(k): the point k metres on down a way it's following, when there is one: the fall is measured down that, since a
  // path cut across a hillside falls along itself and not along a straight line from where it stands.)
  board(dt, m, hx, hz, left, along = null) {
    this.boardFrame = true;
    const a = this.auto, can = !!this.o.pack.slots.off && !m.town && !m.below && !inChurch(m.x, m.y + 1, m.z) && !this.fighting && left > 40;
    const h0 = terrainHeight(m.x, m.z), drop = (k) => { const [x, z] = along ? along(k) : [m.x + hx * k, m.z + hz * k]; return (h0 - terrainHeight(x, z)) / k; };
    const speed = Math.hypot(m.vx, m.vz);
    this.surfCool -= dt;
    // (Off it, however that came about, it isn't straight back on: a stall on a rise used to put it off and on again every second.)
    if (this.wasSurf && !m.surf) this.surfCool = Math.max(this.surfCool, 3);
    this.wasSurf = m.surf;
    if (m.surf) {
      // A rise ahead at speed (the short ones at the foot of the Fall's pitches): a hop over it, as you'd do it, Space let go
      // for a moment and pressed again (src/sim/surf.js: let go for longer and you're off).
      if (this.hopPhase > 0) {
        this.hopPhase -= dt; a.jumpHeld = false;
        if (this.hopPhase <= 0) { this.o.shared.input[INPUT.JUMP] += 1; a.jumpHeld = true; this.hopCool = 1.1; this.o.log?.cast?.('hop'); }
        return;
      }
      this.hopCool = (this.hopCool || 0) - dt;
      const ux = speed > 1 ? m.vx / speed : hx, uz = speed > 1 ? m.vz / speed : hz;
      const rise = (k) => (terrainHeight(m.x + ux * k, m.z + uz * k) - h0) / k;
      if (m.ground && speed > 4.5 && this.hopCool <= 0 && (rise(3) > 0.1 || rise(6) > 0.09)) { this.hopPhase = 0.06; a.jumpHeld = false; this.say('Hopping a rise on the shield.'); return; }
      // Kept on while it's quick, or the slope will make it so: through a flat or a rise with more slope beyond, since what's
      // coming matters more than where it is. Slower than a run on gentle ground, it steps off and runs.
      // (And off at a crawl, before it stalls: stepped off, not stopped dead.)
      const keep = can && left > 18 && (speed > 2.2 || !m.ground) && (speed > 7.5 || drop(25) > 0.06 || (speed > 4.5 && (drop(25) > 0.025 || drop(60) > 0.04)));
      a.jumpHeld = keep;
      if (!keep) this.surfCool = 2;
      this.say(`Riding the shield down (${speed.toFixed(0)} m/s).`);
      return;
    }
    // (Space kept down through the jump, said again each time: whoever called may have let its hands go since the last thought.)
    if (this.surfCool > 0) { a.jumpHeld = this.t - this.surfAt <= 0.9; return; }
    if (can && drop(25) > 0.1 && drop(55) > 0.08 && m.ground && speed > 3.5) {
      this.o.shared.input[INPUT.JUMP] += 1;
      a.jumpHeld = true;
      this.surfAt = this.t; this.surfCool = 2.5;
    } else a.jumpHeld = false;
  }

  // Not getting anywhere: a door to open, a hop, a step aside, a step back, a new path; at length, something else to do.
  unstick(dt, m, moving) {
    const S = this.stuck, g = this.o.game;
    if (!moving || this.fighting) { S.t = 0; S.x = m.x; S.z = m.z; return; }
    S.t += dt;
    if (S.t < 1.4) return;
    const moved = dist(S.x, S.z, m.x, m.z);
    S.t = 0; S.x = m.x; S.z = m.z;
    if (moved > 1.2) { S.n = Math.max(0, S.n - 1); return; }
    S.n++;
    const door = g.nearDoor;
    // (One of Phobos's: by its own doors, src/items/phobos-doors.js.)
    if (door?.ph) { if (!g.phDoors.open.has(door.id)) { g.phDoors.toggle(door); return; } } else if (door && !door.open && !g.locked(door)) { g.doors.toggle(door); return; }
    if (S.n === 1 || S.n === 4) { this.o.shared.input[INPUT.JUMP] += 1; return; }
    if (S.n === 2 || S.n === 5) { S.act = 2; S.actT = 0.8; S.side = Math.random() < 0.5 ? -1 : 1; return; }
    if (S.n === 3 || S.n === 6) { S.act = 3; S.actT = 0.6; this.sub = null; this.subFor = null; this.loc = null; this.eastWay = null; return; }
    if (S.n >= 8) { S.n = 0; this.lost(); }
  }

  // Whatever it was going for can't be got to (no way there, or it's got nowhere for too long): left for a while, and
  // something else found to do.
  lost() {
    const j = this.job;
    // (Twice in the same place inside two minutes: it isn't the errand, it's where it stands. The nav thread finds the way
    // out of the corner on a finer grid of its own, and the motor takes it.)
    const S = this.stuck, was = this.lostAt;
    if (was && this.t - was.t < 120 && dist(was.x, was.z, S.x, S.z) < 1.5 && !this.escapePts) {
      this.nav.ask('escape', { x: S.x, z: S.z }).then((pts) => { if (pts?.length) { this.escapePts = pts; this.escapeUntil = this.t + 12; } });
    }
    this.lostAt = { x: S.x, z: S.z, t: this.t };
    if (j?.kind === 'talk') this.giveUp(`p:${j.who}`, 120);
    else if (j?.kind === 'hunt' && this.patrol) this.giveUp(`s:${this.patrol[0]},${this.patrol[1]}`, 240);
    // (One thing to gather that can't be got to: that one left a while, not the whole quest.)
    else if (j?.mark) this.giveUp(j.mark, 600);
    else if (j) this.giveUp(j.why, 90);
    this.job = null; this.goal = null; this.macro = null; this.sub = null; this.subFor = null; this.patrol = null; this.eastWay = null;
  }

  // The doors it can't open yet (the Sexton's, before his quest), as circles for its paths to keep out of.
  lockedDoors() {
    const g = this.o.game;
    return g.doors.doors.filter((d) => !d.open && g.locked(d)).map((d) => [d.cx, d.cz, 1.1]);
  }

  // ---- what the menu's for

  allQuestsDone() { const Q = this.o.townUI.quests; return Object.keys(RULES).every((id) => Q.done(id)); }
}

