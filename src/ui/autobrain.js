// Auto-play's head (src/ui/autoplay.js has its button, its line on the HUD and its menu). It plays the game the way a player
// does, from the render thread: it reads the snapshot, the pack, the quests and the town, and works the same controls the keys
// and the mouse do (Input.auto: the feet, the run, the cast held; Input.yaw and pitch: the look; the press counters: staff,
// cast, jump, dodge; GameView.takeNearest: E). Nothing is moved or given by hand.
//
// What it does, most pressing first:
//   the opening   waits out the cave, answers to a name, walks out, and follows Lisandra down the Long Road to Bellmourn
//   a fight       anything that means it harm, or what it's hunting: the staff and all six spells on its bar, each for what
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
// Where it walks: in the town, the woods round it and the catacombs, by paths from src/sim/nav.worker.js; out in the countries,
// by the roads (src/core/lands.js ROUTES) and across country, the pines stepped round by the same worker, and the woken seals.
// On the nav ground it never walks at where it's going without a path: it waits for one, and with no way there it leaves it.
// Through a door it goes square on, by a place a pace before its middle and one a pace beyond; and it never talks to anyone,
// opens a chest or takes anything up with a wall between (within()).
import * as LAYOUT from '../core/layout.js';
import { C, C_HERO, C_SIZE, CHARS_START, H, INPUT, MAX_SLIMES, MAX_TUMBLERS, SLIME_FLOATS, SLIMES_START, TUMBLER_FLOATS, TUMBLERS_START } from '../core/layout.js';
import { CAVE_MOUTH, CAVE_OUT, HERD_CONTROL, OPENING, RUN_OUT, WAY } from '../core/opening.js';
import { ROUTE, routeAt, routeDir, routeNear } from '../core/escort.js';
import { ROADS, terrainHeight } from '../core/terrain.js';
import { ROUTES, SITES } from '../core/lands.js';
import { SEALS } from '../core/sites.js';
import { inTown, townDist } from '../core/town.js';
import { CHURCH_GUARD, churchAt, inChurch } from '../core/church.js';
import { floorAt } from '../core/interior.js';
import { GROUP_KEYS, GROUPS, LAIRS, TRIPO_KIND } from '../core/tripo-monsters.js';
import { CAMPS } from '../sim/slimes.js';
import { SPELLS } from '../sim/spells.js';
import { NODES, blocked, pointsAt, spent, startFree, startRanks } from '../sim/skills.js';
import { RULES, isNight } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { PEOPLE } from '../folk/people.js';
import { BEYOND } from '../folk/lines/beyond.js';
import { LISANDRA } from '../folk/lines/lisandra.js';
import { TUMBLER_SIZES } from '../sim/tumblers.js';
import { TRADES, offerFor, worth } from '../folk/shops.js';
import { GEMS, ROBES, gearTotals, matName } from '../items/items.js';
import { inDungeon } from '../core/dungeon.js';
import { EXIT_IN, toWorld as caveWorld } from '../core/dungeon.js';
import { caveStep, doHire, doWarrens, hireJob, hiring, tactics, warrensCoverage, warrensJob } from './autowarrens.js';
import { HallNav, STATIONS, hallAt, inArena, inHall } from '../core/testhall.js';

const TAU = Math.PI * 2;
const wrap = (a) => { a %= TAU; return a > Math.PI ? a - TAU : a < -Math.PI ? a + TAU : a; };
const dist = (ax, az, bx, bz) => Math.hypot(bx - ax, bz - az);
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

// ---------------------------------------------------------------- the world as it judges it

// Posts it keeps clear of until it's strong enough: [x, z, how wide, from what level]. (Velscour's man on the west road and the
// black knight on the cathedral's steps keep a post and a leash: src/core/knights.js, src/sim/sim.worker.js BLACK.)
const CATHEDRAL_GUARD = { x: CHURCH_GUARD[0], z: CHURCH_GUARD[1] };
// The black knight: his post, his leash (BLACK.leash in src/sim/sim.worker.js), where it stands to work on him, and the level it
// goes for him at (raised two each time he sends it back to the town).
const BLACK_POST = CHURCH_GUARD, BLACK_LEASH = 20, SIEGE_RING = 29, BOSS_LEVEL = 11;   // (11 since the six trees: the level its build has a Thunderbolt at)
const HYDRA_AT = churchAt(208, -128);
const POSTS = [
  [-78, -3, 30, 18], [CATHEDRAL_GUARD.x, CATHEDRAL_GUARD.z, 28, 99], [-40, -150, 44, 14], [150, 110, 26, 8],
  [-72, -78, 22, 4], [118, -64, 22, 4], [HYDRA_AT[0], HYDRA_AT[1], 46, 99],
];
// The lairs out in the land (src/core/tripo-monsters.js), by the level it wants before it goes near one.
const LAIR_LEVEL = {
  werewolf: 6, nest: 4, goblin_camp: 2, kobold_den: 2, lost_children: 1, goat_ring: 6, mill_dolls: 5, falls_drake: 8, sallow_drowned: 5,
  fen_worm: 16, fen_harpies: 8, fen_dragon: 24, cutter_raiders: 6, fungal_brood: 7, abbey_road_goats: 7, vigil_guard: 16, obelisk_guard: 16,
  bone_field: 18, ash_dragon: 24, ash_worm: 16, crown_dragon: 24, stair_demons: 12, hollow_dolls: 8, barrow_lords: 10, barrow_wyrm: 20,
  maiden_coven: 9, fell_harpies: 9, gallows_plague: 14, grawl_bats: 10, grove_demons: 12,
};
// What it'll stand and fight, by kind (FOE_NAMES in src/main.js) and its level. A kind added since it was taught (KNOWN_KINDS), it
// judges by its life against its own level; coverage() below names it, so it can be taught properly.
const KNOWN_KINDS = new Set([0, 1, 2, 3, 4, 5, 6, 9, 10]);
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
  ['lisandra_work', 1], ['bed_and_bell', 1], ['letter', 1], ['pines', 1], ['iron_from_dead', 2], ['dead_cant_wait', 3], ['shroud_and_thread', 3], ['bones_for_carver', 3],
  ['long_way_round', 4], ['toll_of_bell', 5], ['millhaven_jelly', 5], ['barrow_lights', 8], ['sallowmere', 8], ['four_watches', 9],
  ['crown_of_teeth', 11], ['black_road', 13],
];
const LEVEL_OF = Object.fromEntries(PLAN);
// A quest added since the plan was written goes on the end of it, at a level guessed from what it pays (coverage() names it).
const guessLevel = (id) => Math.max(1, Math.min(20, Math.round((RULES[id].xp || 200) / 110)));
const PLAN_ALL = PLAN.filter(([id]) => RULES[id]).concat(Object.keys(RULES).filter((id) => !(id in LEVEL_OF)).map((id) => [id, guessLevel(id)]));

// Where each place in a quest's steps is, for walking to: a point, and how near counts.
const area = (k) => {
  if (k === 'catacombs' || k === 'bellcrypt') return { x: churchAt(186, 0)[0], z: 0, r: 6, below: true };
  if (k === 'woods') return { x: -45, z: 150, r: 40 };
  if (k === 'millhaven') { const c = CAMPS.find((q) => q.key === 'millpond'); return { x: c.x, z: c.z, r: 20 }; }
  if (k === 'fen') { const c = CAMPS.find((q) => q.key === 'sallow'); return { x: c.x, z: c.z, r: 30 }; }
  const s = SITES[k];
  return s ? { x: s.x, z: s.z, r: s.r * (k === 'keep' ? 1.4 : 0.9) } : null;
};
// Where to hunt for what a kill step wants.
const HUNTS = {
  woods: [[-45, 150], [20, -125], [-160, 60], [-62, 160], [100, -128], [-170, 70], [60, 120], [-110, 110], [170, 40], [-120, -60]],
  millhaven: CAMPS.filter((c) => c.key === 'millpond').map((c) => [c.x, c.z]),
  fen: CAMPS.filter((c) => ['sallow', 'fen1', 'fen2'].includes(c.key)).map((c) => [c.x, c.z]),
  barrows: CAMPS.filter((c) => c.key === 'barrows').map((c) => [c.x, c.z]),
  bellcrypt: [churchAt(186, 0), churchAt(190, 6), churchAt(182, -6)],
};

// The menu's grinding grounds (src/ui/autoplay.js GRINDS).
export const GRINDS = {
  woods: { name: 'The woods round Bellmourn', line: 'The risen in packs, the graveyards, the chests among the pines.' },
  catacombs: { name: 'The catacombs', line: 'Room after room of the dead below the cathedral, and the best loot there is near town.' },
  lairs: { name: 'The monster lairs', line: 'Every lair it can take at its level, near and far, cleared as they fill again.' },
  jellies: { name: 'The jelly camps', line: 'Out to the millpond and the Weeping Fen: easy work, a long way from home.' },
  roam: { name: 'Roam the land', line: 'Every country and every seal, chests and fights wherever the road goes.' },
};

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
const USE = {
  firebolt: (c) => c.d < 42 && (c.d > 12 ? 3.4 : 2.6) + (c.fresh ? 1.4 : 0),
  frost: (c) => c.d < 32 && 2.2 + (c.fast ? 2.2 : 0),
  lightning: (c) => c.d > 6 && c.d < 30 && (c.around >= 2 ? 4.2 : 1.6),
  missiles: (c) => c.d < 30 && 2.6 + (c.fast ? 0.8 : 0),
  arcaneblast: (c) => c.d < 8.5 && (c.close >= 2 ? 5.6 : c.dn < 6 ? 4.4 : 2.6) + (c.frozen ? 1.5 : 0),
  firebeam: (c) => c.d < 16 && (c.around >= 2 ? 3.6 : 2.7),
  chain: (c) => c.d < 24 && (c.around >= 2 ? 4.6 : c.n >= 2 ? 3.2 : 2.2),
  nova: (c) => (c.close >= 3 ? 8 : c.close >= 2 ? (c.hpf < 0.6 ? 7.6 : 5.2) : c.near >= 3 ? 6 : c.near >= 2 && c.big ? 4.2 : 0),
  meteor: (c) => c.d > 9 && c.d < 55 && (c.around >= 3 ? 6.2 : c.around >= 2 && (c.held || c.frozen || c.pulled) ? 5.6 : (c.still || c.held || c.frozen) && c.big ? 4.8 : 0),
  blizzard: (c) => c.d > 8 && c.d < 36 && (c.around >= 3 ? 5.2 : c.around >= 2 && (c.held || c.pulled) ? 4.6 : (c.still || c.held) && c.big ? 3.2 : 0),
  drain: (c) => c.d < 16 && c.hpf < 0.8 && 3.5 + (1 - c.hpf) * 4,
  lance: (c) => c.d < 40 && (c.inLine >= 2 ? 5 : 2.6),
  well: (c) => c.d > 8 && c.d < 28 && (c.around >= 3 ? 5.6 : c.n >= 3 && !c.pulled ? 4.2 : 0),
  plague: (c) => c.d > 6 && c.d < 22 && (c.around >= 2 ? 4 : c.held && c.big ? 3.2 : 1.5),
  blades: (c) => !c.bladesUp && (c.close >= 2 ? 5 : c.n >= 3 && c.dn < 12 ? 3.8 : 0),
  spikes: (c) => c.d < 14 && (c.inLine >= 2 ? 4.6 : 2.4) + (c.frozen ? 1 : 0),
  wallfire: (c) => c.d > 6 && c.d < 20 && c.coming && (c.around >= 2 ? 4.2 : c.n >= 2 ? 3 : 0),
  // (A healer at its back mends it too: its own Mend waits a little longer then.)
  mend: (c) => c.hpf < (c.healer ? 0.3 : 0.4) && c.dn > 6 && 9,
  wisp: () => 0,
  // (Blink is a way out, not a blow: cast from the kite, facing away. See combat().)
  blink: () => 0,
  // ---- Fire
  comet: (c) => c.d > 6 && c.d < 34 && (c.around >= 2 ? 4.2 : 2.4),
  firenova: (c) => (c.close >= 2 ? 6 : c.near >= 3 ? 4.4 : 0),
  wyrm: (c) => c.d < 28 && 2.8 + (c.fast ? 1.5 : 0),
  phoenix: (c) => c.d < 22 && (c.inLine >= 2 ? 5.2 : c.hpf < 0.6 ? 3.6 : 2.2),
  bomb: (c) => c.d < 40 && (c.big ? 4.6 : c.around >= 2 ? 3.6 : 2),
  inferno: (c) => c.close >= 3 && 7.2,
  // ---- Ice
  coldcone: (c) => c.d < 7.5 && (c.close >= 2 ? 5.2 : 2.6),
  rime: (c) => c.d < 34 && 2.9 + (c.fast ? 1.5 : 0),
  frostray: (c) => c.d < 18 && (c.fast || c.big ? 3.6 : 2.4),
  prism: (c) => c.d < 36 && (c.inLine >= 2 ? 4.8 : 2.2),
  orb: (c) => c.d > 5 && c.d < 24 && (c.around >= 3 ? 5 : c.around >= 2 && (c.held || c.pulled) ? 4.2 : 0),
  // (Worth it only on what a Nova has frozen, or its own cold has just slowed: ICED below.)
  shatter: (c, b) => (c.frozen || b.t - (b.iceT ?? -99) < 4) && c.dn < 15 && 6.5,
  zero: (c) => c.d > 8 && c.d < 38 && (c.around >= 3 ? 6.2 : (c.still || c.held) && c.big ? 4 : 0),
  // ---- Earth
  stone: (c) => c.d < 34 && 2.5 + (c.dn < 6 ? 0.8 : 0),
  thorns: (c) => c.d < 22 && (c.around >= 2 ? 3.4 : 2.2),
  boulder: (c) => c.d > 5 && c.d < 30 && (c.around >= 2 ? 4.4 : 2.2),
  stoneskin: (c) => (c.close >= 2 || c.hpf < 0.6) && c.dn < 9 && 7,
  vine: (c) => c.d > 5 && c.d < 26 && (c.around >= 3 ? 5.4 : c.n >= 3 && c.coming ? 4 : 0),
  quake: (c) => c.d > 6 && c.d < 28 && (c.around >= 3 ? 6 : (c.still || c.held || c.frozen) && c.big ? 3.6 : 0),
  monolith: (c) => c.d < 28 && (c.big ? 5.6 : 2.6),
  // ---- Arcane
  rune: (c) => c.coming && c.d > 7 && c.d < 22 && 3.4,
  crescent: (c) => c.d < 17 && (c.inLine >= 2 ? 4.4 : 2.5),
  stasis: (c) => c.d > 6 && c.d < 26 && (c.around >= 3 ? 5.2 : c.big ? 3.4 : 0),
  disintegrate: (c) => c.d < 24 && (c.inLine >= 2 ? 5 : c.big ? 4.2 : 2.4),
  starfall: (c) => c.d > 10 && c.d < 50 && (c.around >= 3 ? 6 : c.around >= 2 && (c.held || c.frozen || c.pulled) ? 5.4 : (c.still || c.held || c.frozen) && c.big ? 4.2 : 0),
  // ---- Lightning
  spark: (c) => c.d < 30 && 2.7 + (c.fast ? 1.2 : 0),
  fork: (c) => c.d < 20 && (c.around >= 2 ? 4.2 : 2.2),
  // (A seed only pays if there's lightning on the bar to send on from it.)
  seed: (c, b) => c.d < 26 && c.around >= 2 && b.stormOnBar && 3.6,
  thunderclap: (c) => (c.close >= 3 ? 7.6 : c.close >= 2 && c.hpf < 0.6 ? 7.5 : 0),
  // (Both step it through the fight, and it fights from a distance. Blink it keeps as a way out; Stormstep it never slots.)
  stormstep: () => 0,
  // (Out of the sky, where a raised shield can't turn it, and from further off than the black knight's reach.)
  thunder: (c) => c.d > 6 && c.d < 55 && (c.big ? 5 : 3),
  staticfield: (c) => c.close >= 2 && 5.4,
  tempest: (c) => c.d > 8 && c.d < 38 && (c.around >= 3 ? 6.2 : (c.still || c.held) && c.big ? 4.4 : 0),
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
// casts at once with three of them on it. SKY: what comes down on a raised shield from where the board can't turn it, and
// reaches the thirty paces it stands off the black knight at (a Wall of Fire doesn't: 24).
const PANIC = ['nova', 'thunderclap', 'turn'], SKY = ['meteor', 'thunder'];
const CORE = ['firebolt', 'mend'], CORE_ALL = [...CORE, ...PANIC, ...SKY];
const coreOf = (known) => [...CORE, PANIC.find(known), SKY.find(known)].filter(Boolean);
// What the two slots past those are for, so the six between them cover a fight: one for a crowd or a line of them, one to
// pour on a single mark or to get it out of trouble. Each slot's spells take their turn in it (bar()).
const SLOT_A = ['chain', 'well', 'lightning', 'blizzard', 'lance', 'plague', 'wallfire', 'spikes',
  'comet', 'firenova', 'phoenix', 'inferno', 'coldcone', 'prism', 'orb', 'shatter', 'zero', 'thorns', 'boulder', 'vine', 'quake', 'rune', 'crescent', 'stasis', 'starfall',
  'disintegrate', 'fork', 'seed', 'thunderclap', 'staticfield', 'tempest', 'turn', 'sanctuary'];
const SLOT_B = ['arcaneblast', 'drain', 'frost', 'missiles', 'firebeam', 'blades', 'blink',
  'wyrm', 'bomb', 'rime', 'frostray', 'stone', 'stoneskin', 'monolith', 'spark', 'thunder', 'fleet', 'renew', 'aegis', 'empower', 'stillness'];
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
function buildGaps() {
  const out = [], ranks = startRanks(), free = startFree();
  for (const id of BUILD) if (!NODES[id]) out.push(`its build wants "${id}", which isn't a node in the six trees`);
  const want = BUILD.filter((id) => NODES[id]);
  let at = 0;
  for (let lvl = 1; lvl <= 50; lvl++) {
    while (at < want.length && pointsAt(lvl) - spent(ranks, free) > 0 && !blocked(ranks, free, lvl, want[at])) { ranks[want[at]] = (ranks[want[at]] || 0) + 1; at++; }
  }
  if (at < want.length) out.push(`its build stops at "${want[at]}" (${blocked(ranks, free, 50, want[at]) || 'out of points'}), with ${want.length - at} left unbought`);
  return out;
}

// ---------------------------------------------------------------- what it knows, against what the game has

// Everything in the game that auto-play doesn't know how to play: a quest it has no place for in PLAN, a kind of quest step it
// can't do, somewhere it can't find, a foe or a lair it has no measure of, a spell it casts that's gone, a shop it doesn't use.
// Warned in the console when it starts, and the failing list of tools/autoplay/check.mjs. When something's added to the game,
// it's taught here (and the check run), so auto-play keeps playing the whole of it. foeNames: FOE_NAMES from src/main.js.
const STEP_KEYS = new Set(['talk', 'say', 'back', 'bring', 'n', 'enter', 'night', 'visit', 'kill', 'of', 'warden', 'start']);
// The Test Dungeon's counters (src/core/testhall.js STATIONS), and what auto-play does with each: nothing. In there it fights
// whatever's been summoned, and what that is, what it's wearing and who's with it are for whoever's testing to choose
// (hallRun below). A new counter is named here, with what it's for, or coverage() says so.
const HALL_COUNTERS = { gear: 'left to the tester: it fights in what it was given', party: 'left to the tester: it fights beside whoever was hired', foes: 'left to the tester: it fights what was summoned' };
// The blocks of the snapshot it reads (foes() and the rest); a new one is something in the world it can't see yet.
const BLOCKS = new Set(['FX_START', 'CHARS_START', 'SLIMES_START', 'TUMBLERS_START']);
const CASTS = ['firebolt', 'mend', 'wisp', 'blink', ...PANIC, ...SKY];
const FARMS = new Set(['bone', 'iron', 'silk']);
const STOCKS = new Set(['staffs', 'robes', 'skulls', 'curios', 'scrolls']);
export function coverage(foeNames = null) {
  const out = [], people = new Set([...PEOPLE, ...BEYOND, LISANDRA].map((p) => p.id));
  for (const id of Object.keys(RULES)) {
    const R = RULES[id];
    if (!(id in LEVEL_OF)) out.push(`quest ${id}: not in PLAN, so it's taken on last, at a guessed level (${guessLevel(id)})`);
    if (!QUESTS[id]?.giver || !people.has(QUESTS[id].giver)) out.push(`quest ${id}: its giver isn't anyone it can find`);
    for (const st of R.steps) {
      for (const k of Object.keys(st)) if (!STEP_KEYS.has(k)) out.push(`quest ${id}: a step with "${k}", which it doesn't know how to do`);
      for (const a of [st.enter, st.kill, ...(st.visit || [])].filter((q) => typeof q === 'string')) if (!area(a)) out.push(`quest ${id}: nowhere to walk to for "${a}" (area())`);
      if (st.kill && st.kill !== 'catacombs' && !HUNTS[st.kill]) out.push(`quest ${id}: no hunting grounds for "${st.kill}" (HUNTS): it hunts round its middle`);
      if (st.bring && !FARMS.has(st.bring)) out.push(`quest ${id}: wants ${st.bring}, which it doesn't know where to farm`);
      if (st.talk && !people.has(st.talk)) out.push(`quest ${id}: a word with "${st.talk}", who isn't anyone it can find`);
    }
  }
  for (const l of LAIRS) if (!(l.key in LAIR_LEVEL)) out.push(`lair ${l.key}: no level in LAIR_LEVEL, so it keeps clear of it till level 10`);
  for (const g of GROUP_KEYS) if (!(GROUPS[g].hp > 0)) out.push(`monster group ${g}: no hp to measure it by`);
  for (const k of Object.keys(LAYOUT)) if (k.endsWith('_START') && !BLOCKS.has(k)) out.push(`snapshot block ${k}: something new in the world it can't see (foes())`);
  for (const k of CASTS) if (!(k in SP)) out.push(`spell ${k}: it casts this, and it's gone from SPELLS`);
  for (const sp of SPELLS) if (!(sp.key in USE)) out.push(`spell ${sp.key}: no use for it in USE, so it never casts it`);
  for (const k of Object.keys(USE)) if (!(k in SP)) out.push(`spell ${k}: a use for it in USE, and it's gone from SPELLS`);
  for (const sp of SPELLS) if (!NODES[sp.key]) out.push(`spell ${sp.key}: in no tree, so it can never be learned`);
  out.push(...buildGaps());
  for (const sp of SPELLS) if (!CORE_ALL.includes(sp.key) && !SLOT_A.includes(sp.key) && !SLOT_B.includes(sp.key) && !OFF_BAR.has(sp.key)) out.push(`spell ${sp.key}: in neither of its bar's turning slots (SLOT_A for a crowd, SLOT_B for one mark), so it's only ever a stopgap on its bar`);
  for (const k of [...CORE_ALL, ...SLOT_A, ...SLOT_B]) if (!(k in SP)) out.push(`spell ${k}: on its bar's lists, and gone from SPELLS`);
  for (const [k, t] of Object.entries(TRADES)) if (t.stock && !STOCKS.has(t.stock)) out.push(`trade ${k}: sells "${t.stock}", which it doesn't shop for`);
  out.push(...warrensCoverage());
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
      // (An answer that never comes, the thread fallen over, is no answer: nothing waits on it for ever.)
      const late = setTimeout(() => { if (this.calls.delete(id)) resolve(null); }, 4000);
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

let ROAD_NODES = null;
function roadNodes() {
  if (ROAD_NODES) return ROAD_NODES;
  const nodes = [], edges = [];
  const add = (x, z) => { nodes.push({ x, z }); edges.push([]); return nodes.length - 1; };
  const link = (a, b, k = 1) => { const d = dist(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z) * k; edges[a].push([b, d]); edges[b].push([a, d]); };
  for (const r of ROUTES) {
    let prev = -1;
    for (const [x, z] of r.pts) { const i = add(x, z); if (prev >= 0) link(prev, i); prev = i; }
  }
  for (const r of ROADS) {
    let prev = -1;
    r.line.forEach(([x, z], j) => { if (j % 6 && j !== r.line.length - 1) return; const i = add(x, z); if (prev >= 0) link(prev, i); prev = i; });
  }
  // (Where one road leaves another, and the town's own ways between them: across country, a little dearer than a road.)
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    const d = dist(nodes[a].x, nodes[a].z, nodes[b].x, nodes[b].z);
    if (d < 700) link(a, b, 1.3);
  }
  ROAD_NODES = { nodes, edges };
  return ROAD_NODES;
}
const segNear = (ax, az, bx, bz, cx, cz) => {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / L));
  return dist(ax + dx * t, az + dz * t, cx, cz);
};

// ---------------------------------------------------------------- the head

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
    this.ride = null; this.rideHold = false; this.rideCool = 8;                              // on the shield in a fight
    this.used = {}; this.pullWait = 0;
    this.wobble = 0; this.wobbleT = 0; this.yawV = 0; this.pitchV = 0; this.surfCool = 0; this.surfAt = -9;
    this.skip = new Map();     // things it's given up on for a while: key -> until
    this.patrol = null; this.wispT = 0; this.gearT = 0; this.strafe = 1; this.strafeT = 0;
    this.lastPos = null; this.lastHpf = 1;
    this.bump = this.bump || {};
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
      hpf: snap[H.HP] / (snap[H.MAX_HP] || 1), lvl: p.level, stam: snap[H.STAMINA], opening: snap[H.OPENING], openT: snap[H.OPENING_TIME],
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
      out.push({ id: i, kind, x, y, z, d, hp: snap[o + C.HP], maxHp: snap[o + C.MAX_HP], hostile: snap[o + C.HOSTILE] > 0.5, h: kind >= TRIPO_KIND ? 1.1 : i < 2 ? 1.3 : 0.95, glint: snap[o + C.GLINT], after: snap[o + C.AFTER] });
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
      out.push({ idx: nk + i, x: snap[o + 2], y: snap[o + 3], z: snap[o + 4], hpf: snap[o + 5], dead: snap[o + 9] > 0.5,
        role: ROLE[snap[o + 13] | 0], foe: snap[co + C.AFTER] | 0 });
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

  // The posts and lairs it should keep clear of at this level, as circles.
  avoid(m) {
    const out = [];
    for (const [x, z, r, lvl] of POSTS) {
      // (The black knight's door is open ground once he's down, his loot and all.)
      if (x === CATHEDRAL_GUARD.x && z === CATHEDRAL_GUARD.z && !this.blackKnight(this.snap)) continue;
      if (m.lvl < lvl) out.push([x, z, r]);
    }
    for (const l of LAIRS) if (m.lvl < (LAIR_LEVEL[l.key] || 10)) out.push([l.x, l.z, (l.wake || 110) + 15]);
    return out;
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
      if (this.lastHpf < 0.35 && townDist(m.x, m.z) < 40 && this.job) {
        const why = this.job.why;
        this.o.log?.fell(m, m.lvl, this.job.say, why.startsWith('q:') ? why.slice(2) : null);
        this.bump[why] = (this.bump[why] || 0) + 2;
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
    // (Space is only held while it's on the shield, or getting on it: on its way somewhere, or riding it through a fight.)
    if (this.rideHold && !this.fighting) { this.rideHold = false; this.ride = null; }
    if (this.rideHold) this.auto.jumpHeld = true;
    else if (!this.boardFrame) this.auto.jumpHeld = false;
    if (!this.fighting && this.auto.block) { this.auto.block = false; this.guardT = 0; }
    this.motor(dt, m);
    if ((this.gearT -= dt) <= 0 && !this.fighting) { this.gearT = 4; this.dress(); this.learn(); this.bar(); }
    // A light underfoot down among the dead, for whoever's watching.
    if (m.below && !this.fighting && (this.wispT -= dt) <= 0 && m.mana > 40) { this.wispT = this.cast(SP.wisp, 0.3) ? 85 : 2; }
    void g;
  }

  // Stand still. (A cast under way is let go when its time is up, not here.)
  halt() { this.want = null; this.look = null; this.auto.mx = 0; this.auto.mz = 0; this.auto.run = false; }

  // ---- thinking

  think(snap, m) {
    const g = this.o.game;
    this.fighting = false;
    this.useGoal = false;
    this.aim = null;
    // The opening has its own way to go.
    if (m.opening > 0 && m.opening < OPENING.ARRIVED) { this.opening(snap, m); return; }
    const foes = this.foes(snap, m);
    // Down the Warrens, a boss's calls come first: out of the circles, at the dragon's side, behind a pillar.
    if (inDungeon(m.x, m.z) && this.delve(snap, m, foes)) { this.fighting = true; return; }
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

  // ---- spells and the staff

  // Its points, spent in the book as a player spends theirs: the next thing in its build that can be bought, one a look.
  learn() {
    const S = this.o.spellbar.skills;
    if (!S || S.points <= 0) return;
    const seen = {};
    let id = null, saving = false;
    for (const q of BUILD) {
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
    if (S.spend(id)) { this.o.log?.learned?.(id, S.rank(id), this.o.pack.level); this.say(first ? `Learning ${SPELLS[NODES[id].spell].name}.` : 'A point spent in the book.'); }
  }

  // Its bar, set in the book as a player sets theirs from what it's learned, so the six between them cover a fight: what it
  // leans on (Firebolt to open and from range; Mend; the first it knows of a Frost Nova, a Thunderclap or Turn the Dead,
  // for when they're on it; the first it knows of a Meteor or a Thunderbolt, for a crowd, something big or a raised
  // shield), one more for a crowd or a line of them (SLOT_A) and one to pour on a single mark or get it out of trouble
  // (SLOT_B). Those two change every four minutes among what it knows, so that in time every spell has been in its hands
  // (and in the log). With a healer at its back, Mend's place goes to another of them, and with a tank holding them still,
  // to something for the crowd.
  bar() {
    const sb = this.o.spellbar, known = [...sb.known].sort((a, b) => a - b);
    const party = this.snap ? this.party(this.snap).filter((h) => !h.dead) : [];
    const healer = party.some((h) => h.role === 'heal'), tank = party.some((h) => h.role === 'tank');
    const usable = (i) => i !== undefined && sb.known.has(i) && !SPELLS[i].noBar && USE[SPELLS[i].key];
    const want = coreOf((k) => sb.known.has(SP[k])).filter((k) => !(k === 'mend' && healer)).map((k) => SP[k]).filter(usable);
    this.stormOnBar = STORM.some((k) => sb.loadout.includes(SP[k]));
    const turn = Math.floor((this.o.log?.d.t ?? this.t) / 240);
    const take = (list, n) => {
      const have = list.map((k) => SP[k]).filter((i) => usable(i) && !want.includes(i));
      for (let k = 0; k < have.length && n > 0; k++) { const i = have[(turn + k) % have.length]; if (!want.includes(i)) { want.push(i); n--; } }
    };
    // (A tank holding them in a knot: two for the crowd. Otherwise one of each kind.)
    take(SLOT_A, tank && healer ? 2 : 1);
    take(SLOT_B, 1);
    take(SLOT_A, 6 - want.length);
    take(SLOT_B, 6 - want.length);
    // (Anything else it knows, to fill what's left.)
    for (const i of known) if (want.length < 6 && usable(i) && !want.includes(i)) want.push(i);
    want.slice(0, 6).forEach((i, k) => { if (sb.loadout[k] !== i) sb.assign(k, i); });
  }

  // A cast: from its slot on the bar if it's there (the slot's key, as 1 to 6 do), else chosen in the book and cast with F.
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
    if (this.t - (this.staffAt ?? -9) < 0.9) mana -= 13;
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
    const mana = this.purse(m.mana), bar = this.o.spellbar.loadout;
    const has = (k) => SP[k] !== undefined && bar.includes(SP[k]);
    // What's kept back for trouble: a Mend when it's been hurt, a Nova when it's alone among several.
    const reserve = (has('mend') && m.hpf < 0.8 ? 25 : 0) + (PANIC.some(has) && c.n >= 3 && !c.party ? 12 : 0);
    const staff = () => {
      // (A shot costs up to 13 by the staff: with less, the click's wasted on a fizzle.)
      if (!c.aimed || this.staffCool > 0 || mana < 14 || c.d > 40) return;
      // (The last of its mana is for a Mend, when it's low.)
      if (m.hpf < 0.45 && has('mend') && mana < 31) return;
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
      if (sp.mana >= 28 && !SELF.has(sp.key) && c.around < 2 && c.left < (sp.dmg || 40) * 0.4) s *= 0.35;
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
    const hold = key === 'firebolt' ? (c.fresh && c.d > 12 ? 1.5 : c.d > 14 ? 0.95 : 0.5)
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
      // (A flask is lobbed: its eyes go up by the arc it needs, and stay up till it's left the hand. motor().)
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

  opening(snap, m) {
    const st = m.opening, t = m.openT;
    this.halt();
    if (st !== OPENING.ESCORT) this.wayS = this.herS = undefined;
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
      this.say('Out of the cave.');
      const pts = RUN_OUT.concat([[CAVE_MOUTH[0] + CAVE_OUT[0] * 6, CAVE_MOUTH[1] + CAVE_OUT[1] * 6]]);
      let k = 0, best = 1e9;
      pts.forEach((p, i) => { const d = dist(p[0], p[1], m.x, m.z); if (d < best) { best = d; k = i; } });
      const to = pts[Math.min(pts.length - 1, best < 3 || k === 0 ? k + 1 : k)];
      this.steer(to[0] - m.x, to[1] - m.z, false);
      return;
    }
    if (st === OPENING.ESCORT) {
      const foes = this.foes(snap, m).filter((f) => f.hostile && f.d < 30);
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
      // (Never aiming more than a few strides down the way, so it goes round each bend of it and not across the hill.)
      const [ax, az] = routeAt(Math.min(ROUTE.len, Math.max(mine + 3, Math.min(hers - 2.6, mine + 5))));
      if (d < 2.4 && hers > mine) { this.face = Math.atan2(her.x - m.x, her.z - m.z); this.say('Following Lisandra down to Bellmourn.'); return; }
      this.face = null;
      this.steer(ax - m.x, az - m.z, d > 9);
      // (Its eyes on the road ahead: her, and the way she's going.)
      this.look = routeAt(Math.min(ROUTE.len, mine + 6));
      // Down the long slope on its shield, and she gets on hers: once it's on the road. (Her shelf and her steps are
      // narrow and double back; it walks those.)
      const [rx, rz] = routeDir(mine);
      if (mine > routeNear(WAY.at(-1)[0], WAY.at(-1)[1]) + 4) this.board(0.12, m, rx, rz, ROUTE.len - mine);
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
    const fightable = inDungeon(m.x, m.z) ? () => true : (k, l, hp, sl) => fightableAt(k, k === 0 || k === 3 ? m.lvl : l, hp, sl);
    this.kiteCool -= 0.12; this.dodgeCool -= 0.12; this.reactT -= 0.12; this.rideCool -= 0.12;
    const noRide = () => { this.ride = null; this.rideHold = false; };
    // What it can't beat yet, coming for it: away over open ground, toward the town.
    const boss = this.job?.kind === 'boss';
    if (boss && this.blackKnight(snap) && dist(m.x, m.z, BLACK_POST[0], BLACK_POST[1]) < 60 && !foes.some((f) => f.id !== 0 && f.d < 8 && fightable(f.kind, lvl, f.maxHp, f.slime))) return false;
    const scary = foes.filter((f) => !fightable(f.kind, lvl, f.maxHp, f.slime) && f.kind !== 1 && f.hostile && f.d < 26 && !(boss && f.id === 0));
    if (scary.length) {
      const f = scary.reduce((a, b) => (a.d < b.d ? a : b));
      const [ex, ez] = this.escape(m, scary, true);
      noRide();
      this.face = null;
      this.steer(ex, ez, true);
      this.say(`Running from ${[0, 3, 4, 9, 10].includes(f.kind) ? this.foeName(f) : 'something too strong'}.`);
      return true;
    }
    const hunting = this.job?.kind === 'hunt' || this.job?.kind === 'grind';
    // On the way somewhere, only what's on it; hunting, whatever's about. (Once it's in a fight, it finishes it.)
    // (Down the Warrens, the whole room's fight is its fight: a boss across the cave is still its mark.)
    const reach = hunting || this.target || inDungeon(m.x, m.z) ? 30 : 14;
    // (And what's on one of its party, near by: their fight is its fight.)
    const company = this.party(snap).filter((h) => !h.dead);
    const ours = new Set(company.map((h) => h.idx));
    const live = foes.filter((f) => fightable(f.kind, lvl, f.maxHp, f.slime) && !this.skipping(`foe:${f.id}`) && (f.hostile ? f.d < reach || (ours.has(f.after) && f.d < 30) : hunting && f.d < MAX_SIGHT && !inTown(f.x, f.z, 4) && !this.kept(m, f.x, f.z)));
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
    if (m.hpf < 0.28 && dn < 10) {
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
      if (K.t <= 0 || dn > (K.back ? 9 : 12)) { if (!K.back) this.reactT = 0.3; this.kite = K = null; }
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
      if ((turn || close >= 2) && this.canRide(m) && this.rideWay(m, ex, ez) && Math.random() < 0.7) { this.startRide(m, ex, ez, 'away'); this.backedUp = 0; return true; }
      K = this.kite = { x: ex, z: ez, t: turn ? 1.1 + Math.random() * 0.7 : 1.3 + Math.random() * 0.9, back: !turn };
      this.kiteCool = turn ? 2.6 : 1.6; this.backedUp = 0;
      if (turn) return true;
    }
    if (K?.back && !retreat) retreat = [K.x, K.z];
    // Its mark: with a party, what's on the healer or the others, then what the tank's holding (helpPick); else what's
    // coming for it first, then the nearest, and sooner one it has a clean line to, one nearly down, and the one it's
    // already on (it doesn't flit between them). A new one takes a moment to settle on.
    const help = this.helpPick(live, m);
    const want = (f) => { const v = this.sees(f); return f.d - (f.hostile ? 6 : 0) + (v && !v.clear ? 9 : 0) - (f.id === this.target?.id ? 2.5 : 0) - (f.hostile && f.maxHp > 1 && f.hp < f.maxHp * 0.3 ? 3 : 0); };
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
    const tk = this.engage.get(T.id) || { since: this.t, best: T.hp };
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
    // Footwork: back off what's close while it shoots, close in on what's far, step side to side between.
    let mx = 0, mz = 0;
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
      if (!K && dn > 8 && d > 9 && d < 30 && m.hpf > 0.5 && this.t - this.fightSince > 3 && T.hostile && this.canRide(m) && Math.random() < 0.05) {
        const h0 = terrainHeight(m.x, m.z), drop = (sg) => h0 - terrainHeight(m.x - fz * sg * 10, m.z + fx * sg * 10);
        const sg = drop(1) >= drop(-1) ? 1 : -1, wx = -fz * sg * 0.95 - fx * 0.3, wz = fx * sg * 0.95 - fz * 0.3, L = Math.hypot(wx, wz);
        if (this.rideWay(m, wx / L, wz / L)) { this.startRide(m, wx / L, wz / L, 'across'); return true; }
        this.rideCool = 3;
      }
      if (dn < 7.5) { mx = bx; mz = bz; } else if (d > 20) { mx = fx; mz = fz; }
      mx += -fz * this.strafe * 0.6; mz += fx * this.strafe * 0.6;
    }
    if (this.dodgeCool > 1.1) { if (this.dodgeDir) [mx, mz] = this.dodgeDir; else { mx = -fz * this.dodgeSide; mz = fx * this.dodgeSide; } }
    this.steer(mx, mz, false, true);
    // (Backing into something: noted, and the next close call turns into a run instead.)
    this.backedUp = dn < 7.5 && Math.hypot(m.vx, m.vz) < 1 ? (this.backedUp || 0) + 0.12 : 0;
    this.shoot(snap, m, this.scene(m, live, T, near, close, aimed, company));
    const who = live.length > 1 ? `${live.length} foes` : this.foeName(T);
    this.say(retreat ? `Backing away from ${who}, shooting${this.tankNear(m) ? ', to the tank' : ''}.` : blocked ? `No clean line to ${this.foeName(T)}: stepping out for the shot.` : help && T.id === help.T.id ? help.why : `Fighting ${who}.`);
    return true;
  }

  // The fight as it stands, for shoot() and USE: its mark and the nearest, how many and how they stand, what it has going
  // (ice on them, a well drawing them in), and who's with it.
  scene(m, live, T, near, close, aimed, company = []) {
    const d = T.d, fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1);
    const around = live.filter((f) => dist(f.x, f.z, T.x, T.z) < 5.5).length;
    // (What's lined up behind its mark, for what goes through.)
    const inLine = live.filter((f) => { const a = (f.x - m.x) * fx + (f.z - m.z) * fz; return a > 0 && a < 40 && Math.abs((f.x - m.x) * fz - (f.z - m.z) * fx) < 1.5; }).length;
    const sp = Math.hypot(T.vx || 0, T.vz || 0), coming = ((T.vx || 0) * -fx + (T.vz || 0) * -fz) > 1;
    // (What its tank is holding stands still for it, the rest of them about him.)
    const tank = company.find((h) => h.role === 'tank'), held = !!tank && tank.foe === T.id && dist(tank.x, tank.z, T.x, T.z) < 5;
    const pull = this.t - this.pulledT;
    return { T, d, dn: near.d, n: live.length, close, near: live.filter((f) => f.d < 9).length, around, aimed, hpf: m.hpf, left: T.hp, fast: sp > 4 && !held, still: sp < 1.5 || held, big: T.maxHp > 150, inLine, coming,
      bladesUp: this.t - (this.bladesT ?? -99) < 20, shield: false, fresh: this.t - this.fightSince < 2.5,
      frozen: this.t - this.frozenT < 4.2 && d < 13, pulled: pull > 1 && pull < 4.2, held, party: company.length > 0, healer: company.some((h) => h.role === 'heal') };
  }

  // ---- the shield under its feet, in a fight

  // Whether a ride's on: a shield to stand on (on its arm or not: it comes off for this), open ground under the sky, breath
  // for the run and the jump, and not too soon after the last.
  canRide(m) {
    // (Not on the walk down with Lisandra: it keeps by her there.)
    return this.rideCool <= 0 && !!this.o.pack.slots.off && !m.below && !m.town && m.ground && !m.surf && m.stam >= 46 && !(m.opening > 0 && m.opening < OPENING.ARRIVED)
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
    const end = (cool) => { this.ride = null; this.rideHold = false; this.rodeT = this.t; this.rideCool = cool ?? 16 + Math.random() * 16; this.kiteCool = Math.max(this.kiteCool, 0.8); this.reactT = 0.15; return false; };
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
      const fx = (T.x - m.x) / (d || 1), fz = (T.z - m.z) / (d || 1), side = vx * -fz + vz * fx >= 0 ? 1 : -1, k = d < 7 ? -0.5 : d > 16 ? 0.35 : 0;
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
    if (f.kind >= TRIPO_KIND) return `a ${GROUPS[GROUP_KEYS[f.kind - TRIPO_KIND]]?.name.toLowerCase() || 'monster'}`;
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
      if (!d.auto && !d.coins && !this.roomFor(d.item)) continue;
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
      this.goTo(best.x, best.z, best.auto || best.coins ? 1.1 : bd < 1.7 ? 0.5 : 1.2, false, false, m.below);
      if (this.noWay) { this.giveUp(best, 240); this.noWay = null; }
      return true;
    }
    // A chest near by that it hasn't opened: every one, out in the land and in the town's houses (in at the door, and what's
    // in it picked up as it spills). On its own floor only: it doesn't take stairs.
    let ch = null, cd = hunting ? 40 : m.town ? 26 : 14;
    for (const c of g.chests.list) {
      if (c.open || Math.abs(c.y - m.y) > 2.5 || this.skipping(c) || this.kept(m, c.x, c.z)) continue;
      const k = dist(m.x, m.z, c.x, c.z);
      if (k < cd) { cd = k; ch = c; }
    }
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
      this.goTo(ch.x, ch.z, cd < 2 ? 0.5 : 1.2, false, false, m.below);
      if (this.noWay) { this.giveUp(ch, 600); this.noWay = null; }
      return true;
    }
    return false;
  }

  roomFor(item) {
    if (item.type === 'spell') return true;
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
    for (let pass = 0; pass < 3; pass++) {
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
      changed = true;
    }
    // Gems: the best into whatever's worn with an open socket.
    for (const e of [...pack.entries].filter((q) => q.item.type === 'gem').sort((a, b) => this.gemWorth(b.item) - this.gemWorth(a.item))) {
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
      const slot = SLOT_OF(e.item);
      if (slot) return gearScore({ ...pack.slots, [slot]: e.item }) <= base + 0.5;
      return e.item.type === 'gem' && !sockets;
    });
  }

  // ---- what to do next

  plan(m) {
    const prev = this.jobKey;
    const job = this.choose(m);
    const key = job ? `${job.kind}:${job.why}:${job.who ?? ''}:${job.x ?? ''}` : '';
    if (key !== prev || !this.job) { this.job = job; this.jobKey = key; this.patrol = null; this.jobT = this.t; }
    else if (job && this.job) Object.assign(this.job, job);
  }

  choose(m) {
    const { townUI, pack } = this.o, Q = townUI.quests;
    const near = (x, z) => dist(m.x, m.z, x, z);
    // A seal near the way that hasn't woken: a step onto it, for the way back.
    const lands = this.o.lands;
    for (const sl of SEALS) {
      if (lands.awake.has(sl.key) || this.skipping(`seal:${sl.key}`)) continue;
      if (dist(m.x, m.z, sl.x, sl.z) < 90) { if (!this.job || this.job.why !== `seal:${sl.key}`) this.sealSince = this.t; if (this.t - (this.sealSince || this.t) > 40) { this.giveUp(`seal:${sl.key}`, 900); break; } return { kind: 'go', why: `seal:${sl.key}`, x: sl.x, z: sl.z, r: 1.6, say: `Waking the seal of ${sl.name}.` }; }
    }
    // A full pack, or a deal of things to sell: to the town.
    const junk = this.junk();
    const room = this.freeCells();
    // (Only while there's someone open to buy it: at night the town's counters are shut, and it keeps at its work.)
    const buyer = junk.length > 0 && PEOPLE.some((p, i) => TRADES[p.trade]?.buys && this.o.townUI.isOpen(i));
    const wantsTown = ((room < 10 || junk.length >= 6) && buyer) || (m.hpf < 0.45 && !this.known(SP.mend));
    // Once it's at the black knight, it sees him through (unless he's done it in, and it's falling back to mend).
    if (this.job?.kind === 'boss' && this.blackKnight(this.snap) && m.hpf > 0.4) return this.job;
    // Down the Warrens, the Warrens; a party to hire when it's ready for one; then the Warrens themselves when it's strong enough.
    if (inDungeon(m.x, m.z)) return warrensJob(this, m);
    const hire = hireJob(this, m);
    if (hire) return hire;
    const delve = warrensJob(this, m);
    if (delve && !wantsTown) return delve;
    // In the town, its errands: the quest talk first, then the shops.
    const errand = this.errand(m, m.town || wantsTown || townDist(m.x, m.z) < 60);
    if (errand) return errand;
    if (wantsTown && !m.town && !this.skipping('town')) return { kind: 'go', why: 'town', x: 2, z: 3, r: 6, say: room < 10 ? 'Back to Bellmourn: the pack is full.' : 'Back to Bellmourn to sell.' };
    // By night, what can only be done by night.
    if (isNight(m.hour) || m.hour >= 19.5) {
      for (const [id, lvl] of PLAN_ALL) {
        const st = Q.step(id);
        if (!st || this.skipping(`q:${id}`) || !(st.night || st.warden)) continue;
        const job = this.questJob(id, m, lvl);
        if (job) return job;
      }
    }
    // What's ready to hand in, or a word that moves a quest on: before more work.
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const ready = st?.talk || st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready);
      if (!ready) continue;
      const job = this.questJob(id, m, lvl);
      if (job) return job;
    }
    // The black knight on the cathedral's steps, once it's strong enough for him.
    if (this.blackKnight(this.snap) && m.lvl >= BOSS_LEVEL + (this.bump['boss:black'] || 0) && !this.skipping('boss:black') && !(isNight(m.hour) && m.lvl < BOSS_LEVEL + 4)) {
      return { kind: 'boss', why: 'boss:black', say: 'To the cathedral steps: the black knight.' };
    }
    // The quests, in order.
    for (const [id, lvl] of PLAN_ALL) {
      const s = Q.state(id);
      if (!s || s.stage === 'done' || this.skipping(`q:${id}`)) continue;
      const job = this.questJob(id, m, lvl);
      if (job) return job;
    }
    // Quests not yet taken: to their givers.
    const offer = this.offerJob(m);
    if (offer) return offer;
    const all = Object.keys(RULES).every((id) => Q.done(id));
    if (all) {
      if (!this.allDone) { this.allDone = true; this.o.allDone(); }
      return this.grindJob(m, this.grind, 'grind');
    }
    // Nothing it can do yet: levels.
    void pack; void near;
    return this.grindJob(m, m.lvl >= 6 && Q.state('dead_cant_wait') ? 'catacombs' : 'woods', 'level');
  }

  freeCells() {
    const p = this.o.pack;
    let used = 0;
    for (const e of p.entries) { const s = e.item.type === 'weapon' ? 4 : e.item.type === 'shield' ? 6 : e.item.type === 'skull' ? 4 : e.item.type === 'robe' ? 4 : 1; used += s; }
    return 96 - used;
  }

  // The giver of a quest, or whoever a step's to be said to: their place in the town's list.
  personIndex(id) { return this.o.townUI.people.findIndex((p) => p.id === id); }

  questJob(id, m, lvl) {
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
      for (const p of st.start) {
        const i = this.personIndex(p), w = i >= 0 && !seen.includes(p) && !this.skipping(`p:${i}`) && this.reachable(i) ? W.whereOf(i) : null;
        if (w && dist(m.x, m.z, w.x, w.z) < bd) { bd = dist(m.x, m.z, w.x, w.z); best = i; }
      }
      return best === null ? null : this.talkJob(best, 'offer', `${title}: to ${W.people[best].name} for work (${seen.length} of ${st.start.length}).`);
    }
    if (st.bring) {
      if ((this.o.pack.mats[st.bring] || 0) >= st.n) return this.talkJob(giver, 'quest', `${title}: ${st.n} ${matName(st.bring, st.n)} to hand over.`);
      // Bone the woods' dead give up; iron and silk come from those buried down in the catacombs.
      const deep = st.bring !== 'bone' || (this.o.pack.mats.bone || 0) < 2;
      if (deep && Q.state('dead_cant_wait') && m.lvl >= 3) return this.grindJob(m, 'catacombs', `farm:${id}`, `${title}: ${matName(st.bring, 2).toLowerCase()} from the catacombs (${this.o.pack.mats[st.bring] || 0} of ${st.n}).`);
      // (Out of the catacombs, bone and a little iron come off the woods' dead as it grinds for levels anyway.)
      return null;
    }
    if (m.lvl < lvl + (this.bump[`q:${id}`] || 0)) return null;
    if (st.enter) {
      if (st.night && !isNight(m.hour) && !(m.hour >= 19.5)) return null;
      const a = area(st.enter);
      if (!a) return null;
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: a.r, below: a.below, say: `${title}: to ${st.enter === 'catacombs' ? 'the catacombs' : st.enter === 'bellcrypt' ? 'the Bell Crypt' : SITES[st.enter]?.name || st.enter}${st.night ? ', by night' : ''}.` };
    }
    if (st.visit) {
      const seen = s.seen || [];
      const left = st.visit.filter((v) => !seen.includes(v)).map((v) => ({ v, a: area(v) })).filter((q) => q.a).sort((a, b) => dist(m.x, m.z, a.a.x, a.a.z) - dist(m.x, m.z, b.a.x, b.a.z));
      if (!left.length) return null;
      const { v, a } = left[0];
      return { kind: 'go', why: `q:${id}`, x: a.x, z: a.z, r: Math.min(a.r, 25), say: `${title}: to ${SITES[v].name} (${seen.length} of ${st.visit.length}).` };
    }
    if (st.kill) {
      if (st.kill === 'catacombs') return this.grindJob(m, 'catacombs', `q:${id}`, `${title}: the dead below (${s.n} of ${st.n}).`);
      const a = area(st.kill);
      return { kind: 'hunt', why: `q:${id}`, spots: HUNTS[st.kill] || (a ? [[a.x, a.z]] : HUNTS.woods), below: !!a?.below, say: `${title}: ${st.n - s.n} more to put down.` };
    }
    if (st.warden) {
      if (!isNight(m.hour)) return null;
      return { kind: 'hunt', why: `q:${id}`, spots: HUNTS.bellcrypt, below: true, say: `${title}: the bell's warden.` };
    }
    return null;
  }

  talkJob(i, why, say) {
    if (i < 0 || this.skipping(`p:${i}`) || !this.reachable(i)) return null;
    return { kind: 'talk', why, who: i, say };
  }

  // Someone it can walk up to now: on the ground floor (it doesn't take stairs), awake or easily woken, and not running from something.
  reachable(i) {
    const w = this.o.townUI.whereOf(i);
    if (!w) return false;
    if (w.beyond) return true;
    return !(w.busy === 12 || w.busy === 13) && (w.level | 0) <= 0 && w.y < 2.2;
  }

  offerJob(m) {
    const { townUI } = this.o, Q = townUI.quests;
    let best = null, bd = Infinity;
    for (const [id, lvl] of PLAN_ALL) {
      if (Q.state(id) || (RULES[id].needs && !Q.done(RULES[id].needs))) continue;
      const giver = this.personIndex(QUESTS[id].giver);
      if (giver < 0 || this.skipping(`p:${giver}`) || !this.reachable(giver)) continue;
      // (Far-off work can wait till it's nearly ready for it.)
      if (m.lvl + 3 < lvl) continue;
      const w = townUI.whereOf(giver);
      if (!w) continue;
      const d = dist(m.x, m.z, w.x, w.z);
      // (Someone out past the town, like the Bellwright: only on the way.)
      if (giver >= PEOPLE.length && d > 300) continue;
      if (d < bd) { bd = d; best = this.talkJob(giver, 'offer', `To ${townUI.people[giver].name}: there's work.`); }
    }
    return best;
  }

  // What the town's for, if it's there or near: quest talk, then selling, mending, a bed.
  errand(m, here) {
    if (!here) return null;
    const { townUI, pack } = this.o, Q = townUI.quests;
    // (The quests' own talk in the town comes through questJob and offerJob: those first, wherever it is.)
    for (const [id] of PLAN_ALL) {
      const s = Q.state(id), st = Q.step(id);
      if (!s || s.stage === 'done') continue;
      const q = QUESTS[id], giver = this.personIndex(q.giver);
      const talkTo = st?.talk ? this.personIndex(st.talk) : (st?.back || (st?.bring && (pack.mats[st.bring] || 0) >= st.n) || (s.stage === 'making' && this.o.town.day >= s.ready)) ? giver : -1;
      if (talkTo >= 0 && talkTo < PEOPLE.length && !this.skipping(`p:${talkTo}`) && this.reachable(talkTo)) return this.talkJob(talkTo, 'quest', `${q.title}: to ${townUI.people[talkTo].name}.`);
    }
    const offer = this.offerJob(m);
    if (offer && dist(m.x, m.z, 0, 0) < 140) return offer;
    // Selling: to whoever gives most for the most of it, while they're open.
    const junk = this.junk();
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
    const buy = this.shopping(m);
    if (buy) return buy;
    // Mended at the herbalist's, if it's hurt and has the coin.
    if (m.hpf < 0.7 && pack.purse() >= 12) {
      const i = PEOPLE.findIndex((p) => p.trade === 'healing');
      if (i >= 0 && townUI.isOpen(i) && !this.skipping(`p:${i}`) && this.reachable(i)) return { kind: 'talk', why: 'mend', who: i, say: `To ${PEOPLE[i].name}, to be mended.` };
    }
    // A night at the Tolling Bell: when a quest waits on tomorrow, or it's late and it's tired.
    const h = m.hour;
    const making = Object.keys(RULES).some((id) => Q.state(id)?.stage === 'making' && this.o.town.day >= 0 && this.o.town.day < Q.state(id).ready);
    const nightWork = PLAN_ALL.some(([id, lvl]) => { const st = Q.step(id); return st && (st.night || st.warden || (st.kill === 'barrows')) && m.lvl >= lvl; });
    if (h >= 18.3 && h < 23.5 && (making || (m.hpf < 0.5)) && !nightWork && pack.purse() >= 4) {
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
      if (!this.o.townUI.quests.state('dead_cant_wait')) where = 'woods';
      else {
        const sp = this.catacombSpots(m);
        if (sp.length) return { kind: 'hunt', why, spots: sp, below: true, say: say || 'Grinding in the catacombs.' };
        where = 'woods';
      }
    }
    if (where === 'lairs') {
      const ok = LAIRS.filter((l) => m.lvl >= (LAIR_LEVEL[l.key] || 10)).map((l) => [l.x, l.z]).sort((a, b) => dist(m.x, m.z, a[0], a[1]) - dist(m.x, m.z, b[0], b[1])).slice(0, 4);
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

  // The catacombs' spawn points it'll walk, deeper as it grows: never near the rift's Hydra.
  catacombSpots(m) {
    const from = churchAt(172, 0), n = 6 + m.lvl * 2;
    return this.nav.spawns.filter(([x, z]) => dist(x, z, HYDRA_AT[0], HYDRA_AT[1]) > 60).sort((a, b) => dist(a[0], a[1], from[0], from[1]) - dist(b[0], b[1], from[0], from[1])).slice(0, n);
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
    if (j.kind === 'boss') { this.siege(snap, m); return; }
    if (j.kind === 'hire') { doHire(this, m, j); return; }
    if (j.kind === 'warrens') { this.warrensRun(m, foes); return; }
    if (j.kind === 'hunt') { this.hunt(m, j, foes); return; }
    this.halt();
  }

  // The Warrens, with three wipes on the same go counting as beaten back: out by the way in, and two levels more first.
  warrensRun(m, foes) {
    const P = this.o.game.party;
    const wipes = P?.wipes || 0;
    if (this.wipeSeen === undefined) this.wipeSeen = wipes;
    if (wipes > this.wipeSeen) { this.wipeSeen = wipes; this.warrensWipes = (this.warrensWipes || 0) + 1; }
    if (this.warrensWipes >= 3 && inDungeon(m.x, m.z)) {
      this.say('Beaten back by the Warrens: out, and stronger first.');
      const [x, z] = caveWorld(EXIT_IN.x, EXIT_IN.z);
      this.goTo(x, z, 0.5, true);
      return;
    }
    if (this.warrensWipes >= 3) {
      this.warrensWipes = 0; this.bump.warrens = (this.bump.warrens || 0) + 2; this.giveUp('warrens', 900);
      this.o.log?.fell?.(m, m.lvl, 'The Hollowfang Warrens', null);
      this.job = null;
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
      this.patrol = j.roam ? from[Math.floor(Math.random() * from.length)] : from.reduce((a, b) => (dist(m.x, m.z, a[0], a[1]) <= dist(m.x, m.z, b[0], b[1]) ? a : b));
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
    if (!j.since) j.since = this.t;
    // (Upstairs, or somewhere it can't get to: later.)
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
    this.goTo(w.x, w.z, near ? 0.5 : 1.4, d > 12, true);
    // (No way to them at all: upstairs, shut in. Later.)
    if (this.noWay) { this.noWay = null; this.giveUp(`p:${j.who}`, 240); this.job = null; }
  }

  // The talk panel: through the quest's lines, its offers taken, then the counter if that's what it came for.
  converse(dt, m) {
    const { townUI, pack } = this.o, T = this.talk;
    if (!T) { if ((this.loneT = (this.loneT || 0) + dt) > 4) { this.loneT = 0; townUI.close(true); } return; }
    T.t -= dt;
    if (T.t > 0) return;
    T.t = 0.75 + Math.random() * 0.4;
    if (++T.n > 40) { townUI.close(true); this.giveUp(`p:${T.who}`, 120); return; }
    const opts = townUI.view?.opts || [];
    const label = (o) => o.label;
    const at = (f) => opts.findIndex((o) => o.cls !== 'dim' && f(o));
    const id = townUI.people[T.who]?.id;
    // On through what's being said.
    let k = at((o) => ['Go on.', '...', 'To bed.'].includes(label(o)));
    // Yes to an offer.
    if (k < 0) k = at((o) => Object.values(QUESTS).some((q) => q.accept === label(o)));
    // The quest talk it came for, or anything else this person has for it.
    if (k < 0) {
      const want = this.wanted(id);
      k = at((o) => want.has(label(o)) || o.cls === 'offer');
    }
    if (k >= 0) { townUI.choose(k); return; }
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
      if (!s) { if (q.giver === id) out.add(q.title); continue; }
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
  goTo(x, z, near = 1, run = true, person = false, below = false) {
    this.useGoal = true;
    const g = this.goal;
    if (!g || dist(g.x, g.z, x, z) > (person ? 2.5 : 3) || !!g.below !== below) {
      this.goal = { x, z, near, run, t: this.t, below };
      this.macro = null; this.sub = null; this.subFor = null; this.noWay = null;
    } else { g.near = near; g.run = run; if (person) { g.x = x; g.z = z; } }
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
    if (!this.macro || !this.macro.length) { this.macro = this.longWay(m, g); this.sub = null; this.subFor = null; this.loc = null; }
    let W = this.macro[0];
    while (W && dist(m.x, m.z, W.x, W.z) < (W.seal ? 2.2 : W === this.macro.at(-1) ? g.near : 3.5) && !W.seal) { this.macro.shift(); this.sub = null; W = this.macro[0]; }
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
      const fresh = this.subFor !== leg;
      if (fresh) { this.sub = null; this.noWay = null; }
      if (!this.subAsk && this.nav.ready && (fresh || this.t - this.subT > 12 || (this.subTo && dist(this.subTo[0], this.subTo[1], leg.x, leg.z) > 2.5))) {
        this.subFor = leg; this.subT = this.t; this.subTo = [leg.x, leg.z]; this.subAsk = true;
        const want = leg, avoid = this.avoid(this.me(this.o.game.currentSnap())).concat(this.lockedDoors());
        this.nav.ask('path', { from: [m.x, m.z], to: [leg.x, leg.z], avoid }).then((pts) => {
          this.subAsk = false;
          if (this.subFor !== want) return;
          this.subT = this.t;
          // (No way there: said so, for whoever sent it to leave it be. walk() below, and loot() and approach().)
          if (pts?.length) { this.sub = pts; this.noWay = null; } else { this.sub = null; this.noWay = { t: this.t }; }
        });
      }
      if (this.noWay) {
        this.halt();
        if (this.t - this.noWay.t > 0.6) { this.noWay = null; this.lost(); }
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
      let run = g.run && d > 8;
      if (run && k < 5) {
        if (P[0][2]) run = false;
        else if (P.length > 1 && Math.abs(wrap(Math.atan2(P[1][0] - tx, P[1][1] - tz) - Math.atan2(tx - m.x, tz - m.z))) > 0.6) run = false;
      }
      this.steer(tx - m.x, tz - m.z, run);
      this.lookOn(m, P, run);
      if (!m.town) { const L = dist(m.x, m.z, W.x, W.z) || 1; this.board(dt, m, (W.x - m.x) / L, (W.z - m.z) / L, d); }
    } else {
      // Across country: a stretch at a time, by a short path round whatever stands in the way (a wall, a light well, a stand of
      // pines), worked out on the nav thread; till it comes, straight on, stepping round what the probe finds.
      let hx = tx - m.x, hz = tz - m.z;
      const L = Math.hypot(hx, hz) || 1;
      hx /= L; hz /= L;
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
      this.steer(hx, hz, g.run && d > 8);
      if (pts?.length) this.lookOn(m, pts, g.run && d > 8);
      this.board(dt, m, sx, sz, d);
    }
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

  // The long way: straight there on the nav ground; past it, a route over the roads and across country, by the seals when
  // that's shorter, kept off the lairs and posts it isn't ready for.
  longWay(m, g) {
    const end = g;
    if (this.nav.inGrid(m.x, m.z, m.below) && this.nav.inGrid(g.x, g.z, !!g.below)) return [end];
    const direct = dist(m.x, m.z, g.x, g.z);
    const { nodes, edges } = roadNodes();
    const avoid = this.avoid(m);
    const lands = this.o.lands;
    const seals = SEALS.filter((s) => lands.awake.has(s.key));
    // The graph: the roads, here, there, and the woken seals, all on one list.
    const P = nodes.map((n) => ({ x: n.x, z: n.z })).concat([{ x: m.x, z: m.z }, end], seals.map((s) => ({ x: s.x, z: s.z, seal: s })));
    const me = nodes.length, to = me + 1, s0 = to + 1;
    const E = edges.map((l) => l.slice());
    for (let i = nodes.length; i < P.length; i++) E.push([]);
    const cost = (a, b, k) => {
      const A = P[a], B = P[b];
      let c = dist(A.x, A.z, B.x, B.z) * k;
      for (const [x, z, r] of avoid) if (dist(A.x, A.z, x, z) > r && dist(B.x, B.z, x, z) > r && segNear(A.x, A.z, B.x, B.z, x, z) < r) c += 5000;
      return c;
    };
    const join = (a, b, k) => { const c = cost(a, b, k); E[a].push([b, c]); E[b].push([a, c]); };
    for (const i of [me, to, ...seals.map((_, k) => s0 + k)]) {
      for (let j = 0; j < P.length; j++) {
        if (j === i) continue;
        const d = dist(P[i].x, P[i].z, P[j].x, P[j].z);
        if (d < 900 || (i === me && j === to)) join(i, j, 1.3);
      }
    }
    // Seal to seal: a step through.
    for (let a = 0; a < seals.length; a++) for (let b = 0; b < seals.length; b++) if (a !== b) E[s0 + a].push([s0 + b, 30]);
    // Avoided ground on the roads themselves.
    const D = new Float64Array(P.length).fill(Infinity), prev = new Int32Array(P.length).fill(-1), done = new Uint8Array(P.length);
    D[me] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < P.length; i++) if (!done[i] && D[i] < best) { best = D[i]; u = i; }
      if (u < 0 || u === to) break;
      done[u] = 1;
      for (const [v, c0] of E[u]) {
        let c = c0;
        if (u < nodes.length && v < nodes.length) for (const [x, z, r] of avoid) if (segNear(P[u].x, P[u].z, P[v].x, P[v].z, x, z) < r) c += 5000;
        if (D[u] + c < D[v]) { D[v] = D[u] + c; prev[v] = u; }
      }
    }
    if (!Number.isFinite(D[to])) return [end];
    const chain = [];
    for (let k = to; k >= 0 && k !== me; k = prev[k]) chain.push(k);
    chain.reverse();
    const out = [];
    for (let k = 0; k < chain.length; k++) {
      const i = chain[k], p = P[i];
      // A seal stepped through: stand on it, and the next point is where it lets out.
      if (p.seal && k + 1 < chain.length && P[chain[k + 1]].seal) { out.push({ x: p.x, z: p.z, seal: p.seal, to: P[chain[k + 1]].seal }); continue; }
      out.push({ x: p.x, z: p.z });
    }
    void direct;
    return out.length ? out : [end];
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
  // he lets anyone in the town go. So it stands on his flank just outside that, and works on him from there: a Meteor (from
  // above: his shield's no use), Firebolts and Chain Lightning when he's turned from it. If he comes out after it, it backs off
  // past his leash shooting all the way, and as he walks back to his door it has his back. Hurt, it falls back to the town.
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
    // Footwork: never inside his reach; back off what's coming; along the ring otherwise, a step at a time.
    let mx = 0, mz = 0;
    const ox = (m.x - P[0]) / (fromPost || 1), oz = (m.z - P[1]) / (fromPost || 1);
    if (dk < 13 || fromPost < BLACK_LEASH + 2) { mx = (m.x - K.x) / (dk || 1) + ox * 0.6; mz = (m.z - K.z) / (dk || 1) + oz * 0.6; }
    else if (fromPost > SIEGE_RING + 6) { mx = -ox; mz = -oz; }
    else if (sight && !sight.clear && sight.step) { const sg = Math.sign(sight.step), fx = (K.x - m.x) / (dk || 1), fz = (K.z - m.z) / (dk || 1); mx = -fz * sg; mz = fx * sg; }
    else { if ((this.strafeT -= 0.12) <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = -this.strafe; } mx = -oz * this.strafe * 0.4; mz = ox * this.strafe * 0.4; }
    // Right on it: turn and run for it (he's slower than its sprint), then turn back.
    if (dk < 6 && this.kiteCool <= 0) {
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
    if (aim) { yaw = Math.atan2(aim.x - m.x, aim.z - m.z) + aim.w; this.pitch = Math.atan2(aim.y - (m.y + 1.62), Math.max(1, dist(m.x, m.z, aim.x, aim.z))) + (this.t < (this.liftT ?? 0) ? this.lift : 0); }
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
    }
    const L = Math.max(1, Math.hypot(mx, mz));
    a.mx = mx / L; a.mz = mz / L;
    // (Shift held for the run while there's breath for it: let go when it's short, taken up again once it's back, so it
    // runs in long stretches and doesn't flicker between a run and a walk.)
    // (The run-up to a ride on the shield is a few strides: it takes it on whatever breath it has.)
    this.running = w.run && a.mz > 0.6 && m.stam > (this.running ? 10 : this.ride ? 12 : 38);
    a.run = this.running;
    // (Turning on the spot before a step isn't being stuck: only wanting to go and not going is.)
    this.unstick(dt, m, !surf && (a.mx !== 0 || a.mz !== 0));
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
  board(dt, m, hx, hz, left) {
    this.boardFrame = true;
    const a = this.auto, can = !!this.o.pack.slots.off && !m.town && !m.below && !inChurch(m.x, m.y + 1, m.z) && !this.fighting && left > 40;
    const h0 = terrainHeight(m.x, m.z), drop = (k) => (h0 - terrainHeight(m.x + hx * k, m.z + hz * k)) / k;
    const speed = Math.hypot(m.vx, m.vz);
    this.surfCool -= dt;
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
      const keep = can && left > 18 && (speed > 7.5 || drop(25) > 0.06 || (speed > 4.5 && (drop(25) > 0.025 || drop(60) > 0.04)));
      a.jumpHeld = keep;
      if (!keep) this.surfCool = 2;
      this.say(`Riding the shield down (${speed.toFixed(0)} m/s).`);
      return;
    }
    if (this.surfCool > 0) { if (this.t - this.surfAt > 0.9) a.jumpHeld = false; return; }
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
    if (door && !door.open && !g.locked(door)) { g.doors.toggle(door); return; }
    if (S.n === 1 || S.n === 4) { this.o.shared.input[INPUT.JUMP] += 1; return; }
    if (S.n === 2 || S.n === 5) { S.act = 2; S.actT = 0.8; S.side = Math.random() < 0.5 ? -1 : 1; return; }
    if (S.n === 3 || S.n === 6) { S.act = 3; S.actT = 0.6; this.sub = null; this.subFor = null; this.loc = null; return; }
    if (S.n >= 8) { S.n = 0; this.lost(); }
  }

  // Whatever it was going for can't be got to (no way there, or it's got nowhere for too long): left for a while, and
  // something else found to do.
  lost() {
    const j = this.job;
    if (j?.kind === 'talk') this.giveUp(`p:${j.who}`, 120);
    else if (j?.kind === 'hunt' && this.patrol) this.giveUp(`s:${this.patrol[0]},${this.patrol[1]}`, 240);
    else if (j) this.giveUp(j.why, 90);
    this.job = null; this.goal = null; this.macro = null; this.sub = null; this.subFor = null; this.patrol = null;
  }

  // The doors it can't open yet (the Sexton's, before his quest), as circles for its paths to keep out of.
  lockedDoors() {
    const g = this.o.game;
    return g.doors.doors.filter((d) => !d.open && g.locked(d)).map((d) => [d.cx, d.cz, 1.1]);
  }

  // ---- what the menu's for

  allQuestsDone() { const Q = this.o.townUI.quests; return Object.keys(RULES).every((id) => Q.done(id)); }
}

