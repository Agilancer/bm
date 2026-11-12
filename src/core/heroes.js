// The other Tessariels: AI adventurers who live in the world as if it were an MMO. Every one of them woke in a world they
// didn't know, met the most beautiful woman they had ever seen, and was told they were the one true Tessariel.
//
// Shared by both threads. The sim (src/sim/hero.js) moves and fights the bodies and decides what each hero is doing; the
// render thread (src/ui/heroes.js) picks the words (assets/game/heroes/script.json), shows names, guilds, bubbles and the
// chat log. The bodies are built by tools/heroes (build.py: armour mixed and recoloured within class and sex; kit.py:
// weapons, bowstrings cut away so the game draws its own).
//
// ---- GROWING THE WORLD ------------------------------------------------------------------------------------------------
// Heroes go only where PLACES says. When the game gains an area:
//   1. Add a place below: where it is, how far it spreads, what lives there (MOBS keys), and what heroes do there (kind).
//   2. If it holds new monsters, add a MOBS entry: the class the sim checks (by key, in src/sim/hero.js mobKind), how
//      dangerous it is, and the script's sight trigger (the writers' sight_* pools, or mob_sighted if there's none).
//   3. If heroes need a new way to get there (a stair, a bridge, a boat), give the place a route: points to walk in order.
//      The sim walks routes point to point and falls back on the flow field near buildings.
//   4. New activities go in ACTIVITIES with a weight by hour, then a case in Hero.plan() (src/sim/hero.js).
//   5. Give the writers the new place and monsters: the script takes them as {place} and {mob} with no new code, and any
//      sight_<mob>, arrive_<place> pools they add are picked up by name.
// Interiors (the catacombs today) are walked abstractly: heroes go in at the door and come back out with loot and stories
// (see DELVES). To have them seen below, teach Hero.move about floors (src/core/interior.js groundAt) and give the place
// its stair route.

import { ROADS, SUMMIT } from './terrain.js';
import { CHURCH_DOOR, churchAt } from './church.js';

// How many hero bodies the world holds at once: each is a slot in the snapshot and a skinned model on the GPU. (And the
// Free Company's two quartermasters and the Test Dungeon's keeper besides, BROKERS below.)
// (Eight on a phone: one of every class, so any of them can be hired there too.)
export const HERO_SLOTS = { desktop: 16, lean: 8 };

// The Free Company's quartermasters, who hire out a party (src/ui/party.js): one in town by the square, one at the
// Hollowfang Warrens' portal (src/core/dungeon.js BROKER_SPOTS). Bodies of the heroes' own, people of their own. While the
// Test Dungeon is on, the two stand at its counters instead (src/sim/testhall.js postOf).
export const BROKERS = [
  { broker: 'town', body: 'bard_m2', name: 'Aldous Fenn', title: 'Quartermaster of the Free Company' },
  { broker: 'portal', body: 'bard_m3', name: 'Captain Merrow Vale', title: 'Quartermaster of the Free Company' },
  // The Test Dungeon's keeper (src/core/testhall.js), who summons whatever you'd fight. Only ever in its hall.
  { broker: 'hall', body: 'bard_f1', name: 'Ysolde Marr', title: 'Keeper of the Test Dungeon', guild: 'The Test Dungeon' },
];

// The classes, as the sim fights them. hp: how much they take. range: where they like to fight from. move: their pace
// multipliers. size: body scale over the model's own height (lancers are the biggest; build.py already scales by class).
export const CLASSES = {
  paladin: { hp: 280, range: 2.0, walk: 1.0, run: 1.0, ranged: false, title: 'Paladin' },
  lancer: { hp: 340, range: 2.8, walk: 0.95, run: 0.95, ranged: false, title: 'Lancer' },
  archer: { hp: 190, range: 18, want: 8, walk: 1.05, run: 1.05, ranged: true, title: 'Archer' },
  rogue: { hp: 210, range: 1.6, walk: 1.08, run: 1.1, ranged: false, title: 'Rogue' },
  ninja: { hp: 200, range: 1.7, walk: 1.1, run: 1.12, ranged: false, title: 'Ninja' },
  dragoon: { hp: 240, range: 2.6, walk: 1.0, run: 1.02, ranged: false, title: 'Dragoon' },
  // (want: where a ranged class stands to fight. The boomerang throws from close, so the rang cuts through the pack twice;
  // the bard plucks notes from a few strides off, as he does in Velscour.)
  boomerang: { hp: 210, range: 8, want: 5.5, walk: 1.04, run: 1.05, ranged: true, title: 'Boomerang Knight' },
  bard: { hp: 210, range: 9, want: 6, walk: 1.0, run: 1.0, ranged: true, title: 'Bard' },
};
export const CLASS_NAMES = Object.keys(CLASSES);

// The twelve personas the writers gave voices to (assets/game/heroes/script.json). Behaviour leans: how much each one
// fights, chats, wanders, shows off, and stays out after dark.
export const PERSONAS = {
  earnest: { fight: 1, talk: 1, roam: 1, show: 0.6, night: 0.4 },
  braggart: { fight: 1.2, talk: 1.3, roam: 0.9, show: 2, night: 1.2 },
  goblin: { fight: 1.3, talk: 0.8, roam: 1.1, show: 1.4, night: 0.8 },
  kind: { fight: 0.9, talk: 1.2, roam: 0.9, show: 0.5, night: 0.4 },
  minmaxer: { fight: 1.5, talk: 0.7, roam: 1.2, show: 0.8, night: 0.9 },
  newcomer: { fight: 0.8, talk: 1.1, roam: 1.3, show: 0.7, night: 0.3 },
  jokester: { fight: 1, talk: 1.5, roam: 1, show: 1, night: 0.7 },
  lorenerd: { fight: 0.8, talk: 1.2, roam: 1.4, show: 0.5, night: 0.6 },
  grumbler: { fight: 1.1, talk: 0.9, roam: 0.8, show: 0.4, night: 0.5 },
  romantic: { fight: 0.9, talk: 1.3, roam: 0.9, show: 0.8, night: 1.5 },
  quiet: { fight: 1, talk: 0.4, roam: 1.1, show: 0.2, night: 0.6 },
  zealot: { fight: 1.3, talk: 1.1, roam: 0.9, show: 0.7, night: 1.1 },
};
export const PERSONA_NAMES = Object.keys(PERSONAS);

// What lives in the world, as heroes know it. key: the sim's own name for the body (src/sim/hero.js mobKind). danger:
// how many heroes it takes (a lone hero won't take on more than their level allows). sight: the script's trigger.
export const MOBS = {
  zombie: { name: 'zombies', danger: 1, sight: 'sight_zombies' },
  champion: { name: 'a champion', danger: 2, sight: 'sight_zombies' },
  ogre: { name: 'the ogre', danger: 3, sight: 'sight_ogre' },
  necromancer: { name: 'the necromancer', danger: 2, sight: 'sight_necromancer' },
  plaguebearer: { name: 'the plaguebearer', danger: 2, sight: 'sight_plaguebearer' },
  wizard: { name: 'the dead wizard', danger: 2, sight: 'sight_undead_wizard' },
  werewolf: { name: 'the werewolf', danger: 3, sight: 'sight_werewolf' },
  mouth: { name: 'the Abyssal Mouth', danger: 4, sight: 'sight_abyssal_mouth' },
  crab: { name: 'the crab', danger: 2, sight: 'sight_crab' },
  gravehart: { name: 'the Gravehart', danger: 5, sight: 'sight_gravehart' },
  hydra: { name: 'the Bone Hydra', danger: 8, sight: 'sight_bone_hydra' },
  black_knight: { name: 'the black knight', danger: 9, sight: 'sight_black_knight' },
  sentry: { name: 'the black sentry', danger: 9, sight: 'sight_dark_sentry' },
  // The land's monsters that keep nearest the town (src/core/tripo-monsters.js LAIRS): the writers have no pool for them
  // yet, so the heroes call them out with mob_sighted. (Added last: the script's events carry a mob by its place here.)
  goblin: { name: 'goblins', danger: 1, sight: 'mob_sighted' },
  kobold: { name: 'kobolds', danger: 1, sight: 'mob_sighted' },
  spider: { name: 'the great spiders', danger: 2, sight: 'mob_sighted' },
};
// Which of those a Tripo monster is, by its group (src/sim/hero.js mobKind); the rest are only "monsters" to the heroes.
export const TRIPO_MOB = { Goblins: 'goblin', Kobolds: 'kobold', 'Giant Spiders': 'spider' };
export const MOB_KEYS = Object.keys(MOBS);

// Where heroes go. kind: town (errands and talk), hunt (a ground with monsters), delve (an interior, walked abstractly),
// summit (the climb and the view), surf (a run down). spot: the middle. r: how far it spreads. mobs: what's hunted there.
// The hunting grounds follow where the sim puts its monsters (src/sim/sim.worker.js, src/sim/undead.js, field-creatures.js).
export const PLACES = [
  { id: 'well', name: 'the well', kind: 'town', spot: [-1.5, 3.2], r: 4 },
  { id: 'square', name: 'the square', kind: 'town', spot: [3, -4], r: 7 },
  { id: 'market', name: 'the market corner', kind: 'town', spot: [11.5, -1.5], r: 3.5, sell: true },
  { id: 'inn', name: 'the long house', kind: 'town', spot: [-0.75, -11.6], r: 3, rest: true },
  { id: 'north_street', name: 'the north street', kind: 'town', spot: [0, 30], r: 5 },
  { id: 'west_homes', name: 'the west homes', kind: 'town', spot: [-28, 2], r: 5 },
  { id: 'south_lane', name: 'the south lane', kind: 'town', spot: [-8, -38], r: 5 },
  { id: 'east_gate', name: 'the east road', kind: 'town', spot: [34, 2], r: 4 },
  // (Where the monsters keep, off the roads: src/sim/undead.js addUndead and GRAVEYARDS, src/core/field-creatures.js, GRAVEHART in
  // src/sim/sim.worker.js. The great crabs are out at Brightwater Falls, too far for a day's hunting.)
  { id: 'west_fields', name: 'the west woods', kind: 'hunt', spot: [-150, -72], r: 34, mobs: ['zombie', 'necromancer'] },
  { id: 'north_woods', name: 'the north woods', kind: 'hunt', spot: [-45, 150], r: 45, mobs: ['zombie'] },
  { id: 'south_woods', name: 'the south woods', kind: 'hunt', spot: [20, -125], r: 45, mobs: ['zombie', 'wizard'] },
  { id: 'hill_woods', name: 'the hill woods', kind: 'hunt', spot: [-160, 60], r: 26, mobs: ['zombie', 'wizard'] },
  { id: 'ogre_hollow_w', name: 'the western hollow', kind: 'hunt', spot: [-72, -78], r: 20, mobs: ['ogre'] },
  { id: 'ogre_hollow_e', name: 'the eastern hollow', kind: 'hunt', spot: [118, -64], r: 20, mobs: ['ogre'] },
  { id: 'wolf_wood', name: 'the werewolf\'s wood', kind: 'hunt', spot: [40, 160], r: 22, mobs: ['werewolf'] },
  { id: 'mouth_field', name: 'the Mouth\'s hollow', kind: 'hunt', spot: [150, 110], r: 22, mobs: ['mouth'] },
  { id: 'plague_field', name: 'the plague wood', kind: 'hunt', spot: [90, -112], r: 24, mobs: ['plaguebearer', 'zombie'] },
  { id: 'gravehart_lair', name: 'the Gravehart\'s ground', kind: 'hunt', spot: [-48, -158], r: 26, mobs: ['gravehart'] },
  // (Out east of the town, a field away: src/core/church.js. They gather below the steps and go in at the great door.)
  { id: 'cathedral', name: 'the Cathedral', kind: 'delve', spot: churchAt(52, 6), r: 4, door: CHURCH_DOOR },
  { id: 'summit', name: 'the Summit', kind: 'summit', spot: [SUMMIT.x, SUMMIT.z], r: SUMMIT.r - 4 },
  // Further out, beside the roads the land's quests take you down: the nearest of the lairs past the town's own woods
  // (src/core/tripo-monsters.js hill_kobolds, fenway_goblins, dark_spiders_ne: move one and move it here). A long walk, so
  // the other Tessariels are met on the road now, not only in the square. (Added last, so every place before keeps its number.)
  { id: 'hill_road_den', name: 'the kobolds\' den off the hill road', kind: 'hunt', spot: [741, 86], r: 20, mobs: ['kobold'] },
  { id: 'fen_way_camp', name: 'the goblins\' camp on the Fen Way', kind: 'hunt', spot: [70, -480], r: 20, mobs: ['goblin'] },
  { id: 'spider_wood', name: 'the spiders\' wood', kind: 'hunt', spot: [472, -509], r: 22, mobs: ['spider'] },
];
export const PLACE_IDS = PLACES.map((p) => p.id);
export const placeOf = (id) => PLACES.find((p) => p.id === id);

// The two ways up the hill, as points to walk: the Long Road winds up, the Fall is ridden down (src/core/terrain.js).
export const LONG_ROAD = ROADS.find((r) => r.name === 'the Long Road');
export const THE_FALL = ROADS.find((r) => r.name === 'the Fall');

// The catacombs, walked abstractly: how long a party is below, and what they come back with.
export const DELVES = { minutes: [3, 6], loot: [2, 6] };

// What a hero does with their time, weighted by hour: [night 21-5, dawn 5-8, day 8-17, dusk 17-21].
export const ACTIVITIES = {
  hunt: [0.15, 0.6, 1.4, 0.8],
  delve: [0.25, 0.3, 0.5, 0.45],
  summit: [0.05, 0.5, 0.7, 0.55],
  errands: [0.2, 1.2, 0.5, 0.7],
  social: [1.1, 0.6, 0.45, 1],
  perform: [0.6, 0.2, 0.3, 0.8],
  rest: [1.6, 0.3, 0.05, 0.3],
};
export const hourBand = (h) => (h >= 21 || h < 5 ? 0 : h < 8 ? 1 : h < 17 ? 2 : 3);

// The script's triggers, by number, for the events between the threads (EV.HERO: slot, trigger, other slot, place, mob).
// The words for each live in script.json under the same names; a name the script lacks just says nothing.
export const TRIGGERS = [
  'party_call', 'party_join', 'party_decline', 'party_leave', 'party_disband', 'mentor', 'hunt_depart', 'travel_chatter',
  'hunt_arrive', 'hunt_pull', 'hunt_champion', 'class_skill', 'hunt_kill', 'hunt_low_health', 'hunt_heal', 'hunt_loot',
  'rare_drop', 'bags_full', 'hunt_return', 'night_falls_out', 'mob_sighted', 'sight_zombies', 'sight_ogre',
  'sight_necromancer', 'sight_plaguebearer', 'sight_undead_wizard', 'sight_werewolf', 'sight_abyssal_mouth', 'sight_crab',
  'sight_gravehart', 'sight_bone_hydra', 'sight_black_knight', 'sight_dark_sentry', 'boss_first_kill', 'ally_down',
  'hero_death', 'wipe', 'hero_return', 'corpse_run', 'corpse_eaten', 'corpse_recovered', 'level_up', 'level_up_congrats',
  'town_idle', 'spell_practice', 'town_sell', 'town_repair', 'town_buy', 'inn_rest', 'show_off', 'trade_call',
  'well_night', 'away', 'back', 'goodnight', 'dawn', 'dusk_town', 'townsfolk_talk', 'knight_pass', 'child_question',
  'cathedral_approach', 'cathedral_enter', 'catacombs_descend', 'catacombs_crypts', 'rift_edge', 'catacombs_exit',
  'road_climb', 'summit_view', 'surf_race_call', 'surf_start', 'surf_ride', 'surf_hit', 'surf_crash', 'surf_finish',
  'surf_win', 'surf_lose', 'greet', 'greet_guild', 'farewell', 'hero_arrives', 'tessariel_claim', 'origin_story',
  'duel_challenge', 'duel_win', 'duel_lose', 'spectate_duel', 'bard_perform', 'bard_tip', 'dance', 'guild_recruit',
  'guild_chat', 'guild_join', 'gossip', 'gossip_player', 'rival_meet', 'friend_meet', 'respect_meet', 'bond_change',
  'debt_repaid', 'player_first_sight', 'player_greet', 'player_magic_seen', 'player_steals_kill', 'player_invite',
  'player_joins_party', 'player_party_end', 'player_help', 'player_heal', 'player_hurt', 'player_down', 'saved_by_player',
  'player_loot', 'player_skull', 'player_rivalry', 'player_surf', 'player_race_fall', 'player_race_result',
  'player_ignores', 'player_absent_return', 'player_request', 'player_big_kill', 'lisandra_day', 'lisandra_night',
  'lisandra_follow', 'meet', 'player_walk_end',
];
export const TRIG = Object.fromEntries(TRIGGERS.map((t, i) => [t, i]));
// What made a bond, from one side: sent with bond_change (extra = index) and kept with the bond (src/ui/heroes.js).
export const CAUSES = ['party', 'rescued', 'rescuer', 'duel_lost', 'duel_won', 'kill_lost', 'kill_took', 'race_lost', 'race_won'];
// Why a walk with the player ended: sent with player_walk_end (extra = index), read by the script's walk_end gate.
// ('gave_up': a night trail that timed out in town, never reaching the edge.)
export const WALK_ENDS = ['time', 'party', 'edge', 'gave_up'];

// The classes' moves by the writers' names (script.json moves; class_skill's extra is an index into MOVE_KEYS).
export const MOVES = {
  paladin: ['hammer_throw', 'blessed_hammers', 'consecration', 'holy_light', 'smite'], lancer: ['charge', 'lance_thrust', 'shield_wall', 'shield_bash'],
  archer: ['aimed_shot', 'volley', 'kite', 'strafe', 'rain_of_arrows'], rogue: ['flurry', 'vanish', 'backstab'], ninja: ['shadow_step', 'throwing_stars', 'leaping_kick', 'ninja_flurry'],
  dragoon: ['jump', 'jump_land', 'spear_combo', 'spear_barrage'], boomerang: ['throw', 'double_throw', 'catch'], bard: ['war_song', 'marching_song', 'mending_song'],
};
export const MOVE_KEYS = Object.values(MOVES).flat();

// Emotes and gestures the words can ask a hero's body for (render thread -> sim 'heroAct'), as clips in the heroes' bank.
export const GESTURES = {
  wave: ['LP_wave_goodbye_01', 'LP_wave_goodbye_02', 'LP_greet_02'], greet: ['LP_greet_01', 'LP_greet_03', 'LP_greet_04'],
  bow: ['LP_bow'], cheer: ['LP_cheer'], clap: ['LP_clap'], laugh: ['LP_laugh_01', 'LP_laugh_02'], point: ['LP_Pointing_into_the_distance', 'L_Point'],
  angry: ['LP_angry_01', 'LP_angry_02', 'LP_angry_03', 'LP_Talking_to_someone_angrily'], complain: ['LP_complain_01', 'LP_complain_02', 'LP_frustrated_01'],
  dance: ['LP_dance_01', 'LP_dance_02', 'LP_dance_03', 'LP_dance_04', 'LP_dance_05', 'LP_dance_06'], sing: ['LP_sing_01', 'LP_sing_02', 'LP_sing_03', 'LP_sing_04'],
  sit: ['Sitting_Idle_Loop'], fold: ['LP_fold_arms'], look: ['LP_look_around'], cry: ['LP_cry', 'LP_sob'], hug: ['LP_hug'], yes: ['Yes', 'LP_agree'],
  no: ['Idle_No_Loop'], kneel: ['Fixing_Kneeling'], shrug: ['LP_complain_02'], talk: ['Idle_Talking_Loop'], scared: ['LP_scared_01', 'LP_frightened'],
  proud: ['LP_heart_pose', 'LP_swagger'], defeat: ['LP_defeat_02', 'LP_defeat_03'], warm: ['LP_warm_up'], flex: ['LP_swagger'],
};
export const GESTURE_NAMES = Object.keys(GESTURES);

// Seeded choices, so a save's heroes come back as themselves.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

// Who is in the world this session: n bodies from the roster, the classes spread evenly, then a person for each body (name,
// epithet, guild, persona, level). names: assets/game/heroes/names.json. kit: assets/game/heroes/kit.json.
// (only: these bodies and no others, by id, in this order: for looking each of them over, ?bodies=lancer_m1,... in the address.)
export function makeCast(roster, kit, names, n, seed, only = null) {
  const r = rng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const byClass = {};
  for (const h of roster) (byClass[h.cls] ||= []).push(h);
  for (const list of Object.values(byClass)) list.sort(() => r() - 0.5);
  // A lancer and a paladin come first, so even a small world has a tank and a healer for the Free Company to hire out.
  const order = ['lancer', 'paladin', 'archer', 'rogue', 'dragoon', 'ninja', 'boomerang', 'bard'];
  const bodies = only ? only.map((id) => roster.find((h) => h.id === id)).filter(Boolean).slice(0, n) : [];
  for (let round = 0; !only && bodies.length < n && round < 12; round++) {
    for (const c of order) {
      if (bodies.length >= n) break;
      // (Paladins are rare: past the first two, one in a few.)
      if (c === 'paladin' && round > 1 && round % 2) continue;
      const h = byClass[c]?.[round];
      if (h) bodies.push(h);
    }
  }
  const guilds = names.guilds.slice().sort(() => r() - 0.5).slice(0, Math.max(3, Math.ceil(n / 2.6)));
  const usedNames = new Set();
  return bodies.map((h, i) => {
    let name;
    for (let t = 0; t < 20; t++) { name = pick(h.sex === 'f' ? names.female : names.male); if (!usedNames.has(name)) break; }
    usedNames.add(name);
    const ep = r() < 0.45 ? pick(names.epithets) : null;
    const epithet = ep ? (typeof ep === 'string' ? ep : ep.text) : '';
    const form = ep && typeof ep === 'object' ? ep.form : 'the';
    const full = !epithet ? name : form === 'surname' ? `${name} ${epithet}` : form === 'of' ? `${name} ${epithet}` : `${name} ${epithet.startsWith('the ') ? epithet : 'the ' + epithet}`;
    // Some go guildless, as in any game.
    const guild = r() < 0.82 ? pick(guilds) : '';
    const persona = pick(PERSONA_NAMES);
    const level = 4 + Math.floor(r() * r() * 22);
    const k = kit.heroes[h.id] || {};
    return { slot: i, body: h.id, cls: h.cls, sex: h.sex, height: h.height, name, full, guild, persona, level, gold: Math.floor(20 + r() * 400),
      kit: k, string: k.string ? kit.strings[k.string] : null, seed: Math.floor(r() * 1e9) };
  });
}

// The quartermasters, after the cast (so the cast keeps its slots).
export function withBrokers(cast, roster, kit) {
  const out = cast.slice();
  for (const b of BROKERS) {
    const h = roster.find((x) => x.id === b.body) || roster.find((x) => x.cls === 'bard');
    if (!h) continue;
    // (They wear bards' bodies, but they keep the Company's books, not a lute.)
    const k = { ...(kit.heroes[h.id] || {}), lute: null };
    out.push({ slot: out.length, body: h.id, cls: h.cls, sex: h.sex, height: h.height, name: b.name, full: b.name, guild: b.guild || 'The Free Company', persona: 'kind', level: 30,
      gold: 0, kit: k, string: k.string ? kit.strings[k.string] : null, seed: 7 + out.length, broker: b.broker, title: b.title });
  }
  return out;
}
