// Auto-play in the Free Company's way (src/ui/party.js) and down the Hollowfang Warrens (src/core/dungeon.js,
// src/sim/dungeon.js): hiring a party at a quartermaster's post, walking the caves room by room with the party gathered, and
// fighting the bosses by their calls: out of the circles and the fire, at the dragon's side, behind a pillar when she flies,
// the adds first, the twins kept even. src/ui/autobrain.js calls in here; this keeps the Warrens' rules in one place.
import { ALL_PACKS, BOSSES, BOSS_KEYS, BROKER_SPOTS, CaveNav, DELVES, PARTY, PERCH, PILLARS, POSTS, caveClear, caveFloorY, caveRoom, delveByKey, delveOf, inDungeon, roleOf, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { hirePrice } from './party.js';
import { edge, wayOut, wheelSpot } from '../core/perils.js';
import { REACH } from '../sim/spells.js';
import { INPUT } from '../core/layout.js';

// The level it goes down at, the first time (raised two each time the Warrens beat it three times over), and the level it
// hires a party at (a little before, so it has them for the woods too).
export const WARRENS_LEVEL = 7, HIRE_LEVEL = 6;
// (How far off a portal has to be before Dungeon Runs take the skull's teleport to it rather than walk.)
const TELEPORT_FAR = 260;
// The way through each party dungeon (src/core/dungeon.js DELVES), room by room, in the order they're walked from the way
// in. (Each pack and boss is in one of these: coverage() below checks every one is.) Blackvigil's barracks, armoury and
// gallery open off its inner ward; it looks into each on its way up.
export const WAYS = {
  warrens: ['mouth', 'diggings', 'tallow', 'dig', 'warren', 'feast', 'throne', 'descent', 'lair'],
  blackvigil: ['bv_gate', 'bv_guard', 'bv_ward', 'bv_innergate', 'bv_barracks', 'bv_armoury', 'bv_gallery', 'bv_library', 'bv_sanctum', 'bv_chapel', 'bv_stair', 'bv_hall', 'bv_court', 'bv_walk', 'bv_ante', 'bv_throne'],
  deeps: ['hd_mouth', 'hd_galleries', 'hd_herd', 'hd_ramshall', 'hd_webs', 'hd_falls', 'hd_brood', 'hd_dark', 'hd_lake'],
  // The four made after them. The Vaults' coil, with a look into the Strongroom. The Sporehold's west leaf, back through the
  // hub, its east leaf, the hub again, and north. The Playhouse as it's used: front of house, the Wardrobe (the Seamstress
  // has to die before the stage is lit), round by the Store and the green room onto the Stage, and up. The Kingsbarrow's
  // ring, east about to the two halls at its back, home by the west, and down the stair.
  vaults: ['dv_stair', 'dv_toll', 'dv_reeds', 'dv_wallow', 'dv_cistern', 'dv_strong', 'dv_cistern', 'dv_tide', 'dv_sluice', 'dv_sump'],
  sporehold: ['sh_sink', 'sh_stair', 'sh_ring', 'sh_kennel', 'sh_den', 'sh_ring', 'sh_garden', 'sh_bower', 'sh_ring', 'sh_veil', 'sh_heart'],
  playhouse: ['ph_foyer', 'ph_cloak', 'ph_gallery', 'ph_house', 'ph_wardrobe', 'ph_house', 'ph_props', 'ph_green', 'ph_stage', 'ph_green', 'ph_stair', 'ph_nursery', 'ph_attic'],
  kingsbarrow: ['kb_door', 'kb_dromos', 'kb_south', 'kb_cups', 'kb_east', 'kb_queens', 'kb_warden', 'kb_queens', 'kb_north', 'kb_cross', 'kb_hounds', 'kb_ossuary', 'kb_hounds', 'kb_west', 'kb_shields', 'kb_south', 'kb_stair', 'kb_vault'],
  // The Elder Dragon Gods: over the Span and the Shards to the Scale Altar, then out along each god's bridge in the order
  // the seals let you, and back to the altar between: the Galeward, the Cinderwell, up the Rimespire, the Lip of the Maw.
  // (Their islets are reached in the fights, by a leap or a god's blow: not walked to, so not on the way.)
  elder: ['ed_threshold', 'ed_span', 'ed_shards', 'ed_altar', 'ed_galegate', 'ed_galeward', 'ed_galegate', 'ed_altar', 'ed_cindergate', 'ed_cinderwell', 'ed_cindergate', 'ed_altar',
    'ed_rimegate', 'ed_rime0', 'ed_rime1', 'ed_rime2', 'ed_rime3', 'ed_summit', 'ed_rime3', 'ed_rime2', 'ed_rime1', 'ed_rime0', 'ed_rimegate', 'ed_altar', 'ed_mawgate', 'ed_maw'],
  // Phobos's sewers (src/core/delve-sewers.js): each sector from its outfall, a look through its gate, and its great hall last.
  westdrains: ['pw_out', 'pw_main', 'pw_grate', 'pw_office', 'pw_grate', 'pw_over', 'pw_basin', 'pw_gate', 'pw_basin', 'pw_over', 'pw_grate', 'pw_cinder', 'pw_soot', 'pw_rook', 'pw_well', 'pw_larder'],
  sloughmains: ['ps_out', 'ps_main', 'ps_weir', 'ps_gate', 'ps_weir', 'ps_chain', 'ps_market', 'ps_chain', 'ps_weir', 'ps_tanmain', 'ps_dye', 'ps_silt', 'ps_bed', 'ps_east'],
  charnelruns: ['pc_out', 'pc_main', 'pc_cistern', 'pc_gate', 'pc_cistern', 'pc_stair', 'pc_cata', 'pc_mages', 'pc_rise', 'pc_mages', 'pc_chapter', 'pc_gate2'],
  highconduits: ['pa_out', 'pa_main', 'pa_fall', 'pa_gate', 'pa_fall', 'pa_dukes', 'pa_lamps', 'pa_long', 'pa_lamp', 'pa_approach', 'pa_garden', 'pa_aqfoot'],
  // The Middle Ward (gone into from the Lower Ward's Middle Ward Gate: delveWay): the Gallery and the east wings, the
  // Library and its Stacks, the west wings by the Reading Walk, back down the Gallery, and the Feast in his hall last.
  middleward: ['cm_gate', 'cm_court', 'cm_gallery', 'cm_maps', 'cm_horns', 'cm_maps', 'cm_gallery', 'cm_library', 'cm_stacks', 'cm_library', 'cm_rooms', 'cm_library',
    'cm_still', 'cm_conserv', 'cm_still', 'cm_library', 'cm_gallery', 'cm_court', 'cm_screens', 'cm_hall'],
  // Castle Velscour's Lower Ward (src/core/delve-castle.js): the west wings, the Oubliettes, the east wings, the stair up, and
  // the Gate Captain in his yard last.
  lowerward: ['cl_gate', 'cl_yard', 'cl_wrange', 'cl_kitchen', 'cl_cellar', 'cl_kitchen', 'cl_aq', 'cl_aqhead', 'cl_aq', 'cl_kitchen', 'cl_wrange', 'cl_hall', 'cl_wrange', 'cl_yard',
    'cl_pit', 'cl_oub', 'cl_pit', 'cl_yard', 'cl_erange', 'cl_drill', 'cl_bunks', 'cl_drill', 'cl_armstair', 'cl_armoury', 'cl_coal', 'cl_forge', 'cl_coal', 'cl_armoury', 'cl_armstair', 'cl_drill',
    'cl_erange', 'cl_mstair', 'cl_mgate', 'cl_mstair', 'cl_erange', 'cl_yard'],
  // The Iron Barracks (src/core/delve-barracks.js): down the Muster Stair, the Kennels and the Practice Yard off the Muster
  // Hall, the War Room, the Cells and the Stores off it, and the Iron Marshal in his hall last.
  ironbarracks: ['ib_stair', 'ib_muster', 'ib_kennels', 'ib_muster', 'ib_yard', 'ib_muster', 'ib_war', 'ib_cells', 'ib_war', 'ib_stores', 'ib_war', 'ib_iron'],
};
// (A later delve carries its own: auto: { way: [...] }, written with it. src/core/delve-castle-a.js and the rest.)
for (const d of DELVES) if (d.auto?.way) WAYS[d.key] = d.auto.way;
export const WAY = WAYS.warrens;
// The level it wants before it goes down each the first time (its own, from the delve: the Warrens 7, the Deeps 10,
// Blackvigil 14), raised two each time that dungeon beats it three times over.
export const delveLevel = (key) => delveByKey(key)?.level ?? 99;
// What it knows of them, for coverage(): every pack's and boss's key. A pack it fights as it fights any pack down there
// (the tank's mark, the healer kept clear, out of what's marked). A boss by tactics() below: its calls are all marks on the
// ground, shots, rings to jump and adds, which it answers the same way in every fight, and a turn on it, which it takes
// behind the tank; the Warrens' three have rules of their own besides.
export const KNOWN = new Set([
  'hf_diggings', 'hf_tallow', 'hf_warren', 'hf_feast', 'hf_descent', 'grubnash', 'twins', 'venomaw',
  'bv_guard', 'bv_ward_south', 'bv_ward_north', 'bv_barracks', 'bv_armoury', 'bv_gauntlet', 'bv_gallery_watch', 'bv_library', 'bv_chapel', 'bv_stair',
  'bv_hall_low', 'bv_hall_high', 'bv_walk', 'bv_ante', 'maldrec', 'sorvane', 'brothers', 'castellan',
  'hd_galleries', 'hd_herd', 'hd_webs', 'hd_falls', 'hd_dark', 'hrymgar', 'broodmother', 'sleeper',
  // (The later four's bosses each have something that isn't a mark to be out of: somewhere to be, or not a step. The fight
  // says which as it goes (its `order`, posted with it), and tactics() below does as it's told: the same rule for all twelve.)
  'dv_toll', 'dv_gallery', 'dv_reeds', 'dv_cistern', 'dv_strong', 'dv_sluice', 'bloat', 'sallow', 'leviathan',
  'sh_stair', 'sh_ring_west', 'sh_ring_east', 'sh_kennel', 'sh_garden', 'sh_veil', 'sh_den_run', 'sh_bower_run', 'mouldfang', 'morel', 'heart',
  'ph_cloak', 'ph_gallery', 'ph_house_back', 'ph_house_front', 'ph_props', 'ph_green', 'ph_stair', 'ph_nursery', 'seamstress', 'leadingman', 'dollmaker',
  'kb_dromos', 'kb_seal', 'kb_cups', 'kb_east', 'kb_queens', 'kb_cross', 'kb_hounds', 'kb_west', 'kb_shields', 'gravewarden', 'golem', 'wyrm',
  // (The Elder Gods' four likewise: where to stand is all in their orders, a gust stone's way to it among them.)
  'ed_span', 'ed_shards_west', 'ed_shards_east', 'ed_shards_drake', 'ed_galegate', 'ed_cindergate', 'ed_rimegate', 'ed_mawgate', 'thyrraxis', 'kaldurra', 'morvekh', 'nihvaroth',
  // (Phobos's sewers: plain packs, and four plain fights, every call in them a mark, a shot, a ring or adds.)
  'pw_main', 'pw_main2', 'pw_cinder', 'pw_soot', 'pw_rook', 'pw_well', 'pw_basin', 'pw_over', 'spiderqueen',
  'ps_main', 'ps_main2', 'ps_tanmain', 'ps_dye', 'ps_silt', 'ps_chain', 'ps_market', 'ps_weir', 'greatworm',
  'pc_main', 'pc_main2', 'pc_cistern', 'pc_cata', 'pc_cata2', 'pc_mages', 'pc_rise', 'drownedabbot',
  'pa_main', 'pa_main2', 'pa_fall', 'pa_dukes', 'pa_lamps', 'pa_long', 'pa_approach', 'lamplighter',
  // (Castle Velscour's Lower Ward: plain packs, and the Gate Captain, whose garrison it kills first as it would any adds.)
  'cl_wrange', 'cl_kitchen', 'cl_cellar', 'cl_erange', 'cl_drill', 'cl_bunks', 'cl_armoury', 'cl_forge', 'cl_pit', 'cl_oub', 'cl_hall', 'cl_aq', 'cl_aqhead', 'cl_mstair', 'cl_wway', 'cl_eway', 'gatecaptain',
  // (And the Middle Ward's: plain packs, and the Feast, whose servers it kills first as it would any adds; and the long
  // tables and the aisle are lines on the floor like any others, perilStep's.)
  'cm_court', 'cm_screens', 'cm_gallery', 'cm_maps', 'cm_horns', 'cm_stacks', 'cm_still', 'cm_conserv', 'cm_hway', 'feast',
  // (The Iron Barracks: plain packs; the Kennelmaster's scent is an order (to the trough), the Quartermaster's runners and
  // the Marshal's standard are orders (to them), the rest marks, rings and adds, as any.)
  'ib_stairguard', 'ib_rank_w', 'ib_rank_e', 'ib_drill', 'ib_officers', 'ib_defaulters', 'kennelmaster', 'quartermaster', 'ironmarshal',
]);
// (And every pack and boss of a delve that carries its own way: fought as any are, their calls marks, shots, rings, adds
// and orders.)
for (const d of DELVES) if (d.auto?.way) { for (const p of d.packs) KNOWN.add(p.key); for (const b of d.bosses) KNOWN.add(b.key); }
export function warrensCoverage() {
  const out = [];
  for (const d of DELVES) {
    const way = WAYS[d.key];
    if (!way) { out.push(`dungeon ${d.key}: no way through it in WAYS (src/ui/autowarrens.js), so it never goes down it`); continue; }
    for (const p of ALL_PACKS.filter((q) => d.packs.includes(q))) {
      if (!KNOWN.has(p.key)) out.push(`${d.name}, pack ${p.key}: not in KNOWN (src/ui/autowarrens.js)`);
      if (!way.includes(p.room)) out.push(`${d.name}, pack ${p.key}: its room ${p.room} isn't on the way through`);
    }
    for (const b of BOSSES.filter((q) => q.delve === d.key)) {
      if (!KNOWN.has(b.key)) out.push(`${d.name}, boss ${b.key}: no fight taught for it (src/ui/autowarrens.js tactics)`);
      if (!way.includes(b.room)) out.push(`${d.name}, boss ${b.key}: its room ${b.room} isn't on the way through`);
    }
    for (const r of d.rooms) if (!way.includes(r.id) && !r.leap) out.push(`${d.name}, room ${r.id}: not on the way through, so it never goes there`);
    for (const id of way) if (!d.rooms.some((r) => r.id === id)) out.push(`${d.name}: its way through names a room, ${id}, that isn't there`);
    if (!BOSSES.some((b) => b.key === d.last && b.delve === d.key)) out.push(`${d.name}: no last boss, so it never knows it's done`);
  }
  return out;
}

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// Where to walk to get down delve d from where it is (here: the delve it's down now, or null), as a point in the world: its
// portal out on the land (a ward gone into from another, within, has that one's: in there, then on through its gate); from
// inside another, the gate straight to it, or the gate to the ward it's within, or the gate back to the ward this one's
// within; else out by the way in. null if the gate it wants is shut (open: the bosses that have ever died, 'boss:<key>').
export function delveWay(here, d, open = () => true) {
  if (!d || here?.key === d.key) return null;
  // (Out on the land: to its door, or to the door of the ward it's gone into from; nowhere, if that door's locked.)
  if (!here) return d.shutBy && !open(d.shutBy) ? null : [d.portal.x, d.portal.z];
  // The gates between delves, as far as they go: the first of the way through them to it, every one of them open.
  const from = new Map([[here.key, null]]), q = [here];
  while (q.length && !from.has(d.key)) {
    const c = q.shift();
    for (const l of c.links || []) { if (from.has(l.to) || (l.shut && !open(l.shut))) continue; from.set(l.to, c === here ? l : from.get(c.key)); const o = delveByKey(l.to); if (o) q.push(o); }
  }
  const l = from.get(d.key);
  if (l) return toWorld(l.x, l.z, here);
  // (No way through from here: a ward gone into only from another can't be reached; anything else, out and round.)
  return d.within ? null : toWorld(here.exitIn.x, here.exitIn.z, here);
}
// (A flow field for each dungeon, made when it first walks there.)
const navs = new Map();
const caveNav = (x, z) => { const d = delveOf(x, z) || DELVES[0]; let n = navs.get(d.key); if (!n) navs.set(d.key, n = new CaveNav(d)); return n; };

// ---- hiring ----------------------------------------------------------------------------------------------------------------

// A job to go and hire, if it wants a party and can pay for one: to the nearer quartermaster.
export function hireJob(b, m) {
  const P = b.o.game.party;
  if (!P || P.fit() || m.lvl < HIRE_LEVEL || b.skipping('hire') || !b.allow('aiHire')) return null;
  // (What's still to hire, and what it costs: it keeps a little back.)
  const r = P.roles(), want = PARTY.size - P.members.length;
  const cost = hirePrice(m.lvl + 1) * want;
  if (b.o.pack.purse() < cost + 100) return null;
  // (Whichever post is nearest: the town's, the Warrens', one at a later delve's portal. Not the Test Dungeon's keeper.)
  const which = Object.keys(BROKER_SPOTS).filter((k) => k !== 'hall').sort((p, q) => dist(m.x, m.z, BROKER_SPOTS[p][0], BROKER_SPOTS[p][1]) - dist(m.x, m.z, BROKER_SPOTS[q][0], BROKER_SPOTS[q][1]))[0];
  const [x, z] = BROKER_SPOTS[which], post = POSTS.find((q) => q.broker === which);
  void r;
  return { kind: 'hire', why: 'hire', which, x, z, say: `To ${which === 'town' ? 'Aldous Fenn by the square' : post ? `${post.name} at ${post.delve}` : 'Captain Vale at the Warrens'}, to hire a party.` };
}

export function doHire(b, m, j) {
  const g = b.o.game, P = g.party, T = g.heroTalk;
  b.say(j.say);
  const h = T?.heroes.find((x) => x.p.broker === j.which);
  if (!h || !P) { b.giveUp('hire', 300); b.job = null; return; }
  const d = dist(m.x, m.z, h.x, h.z);
  if (d > 2.4) { b.face = null; b.goTo(h.x, h.z, 1.6, d > 10, true); return; }
  // (Face to face with him, nothing between: as with anyone it has a word with. src/ui/autobrain.js within().)
  const reach = b.within(m, 'broker', h.x, m.y + 1.2, h.z);
  if (reach === false) { b.face = null; b.goTo(h.x, h.z, 0.6, false, true); return; }
  b.halt();
  b.face = Math.atan2(h.x - m.x, h.z - m.z);
  if (!reach || (b.hireWait = (b.hireWait || 0) + 0.12) < 0.6) return;
  b.hireWait = 0;
  // Face to face: E, as you'd press it (the quartermaster's books open), then the choosing (hiring(), next frames).
  if (g.nearHero?.h === h) g.takeNearest(); else P.talkTo(h);
  if (!P.open) { b.giveUp('hire', 120); b.job = null; }
}

// The quartermaster's books open: a tank first, a healer, then the best of the rest it can pay for; then shut them.
export function hiring(b) {
  const P = b.o.game.party;
  b.halt();
  if ((b.hireT = (b.hireT || 0) + 0.12) < 0.8) return;
  b.hireT = 0;
  const r = P.roles();
  // (Old companions too, with the gear they have: src/ui/party.js companionOffers. The better kitted, the likelier.)
  const offers = (P.allOffers?.() || P.offers || []).filter((o) => o.price <= b.o.pack.purse() && (!o.entry || P.slotFor(o.entry) >= 0));
  const worth = (o) => o.level + (o.gearScore || 0) / 25;
  const best = (role) => offers.filter((o) => roleOf(o.cls) === role).sort((x, y) => worth(y) - worth(x))[0];
  let o = null;
  if (!r.tank) o = best('tank');
  if (!o && !r.heal) o = best('heal');
  if (!o && P.members.length < PARTY.size && (r.tank || !best('tank')) && (r.heal || !best('heal'))) o = best('dps');
  if (o && !P.full()) {
    const k = P.opts.findIndex((x) => x.label.startsWith(`${o.name},`));
    if (k >= 0) { P.choose(k); b.o.log?.cast?.('hire'); b.o.note?.(`Auto-play: hired ${o.name}, a level ${o.level} ${o.cls}.`); return; }
  }
  P.close();
  b.job = null;
  b.giveUp('hire', P.fit() ? 600 : 240);
}

// ---- down the Warrens -----------------------------------------------------------------------------------------------------

// A dungeon to go down, with a party and the level for it: the one it's in; else one a quest it has in hand wants (want:
// their keys, from src/ui/autobrain.js delveWants), the nearest to its level first; else, the first it's fit for that it
// hasn't just been through and that no quest still to do has work down (owed). The Warrens keeps its old name among its reasons ('warrens'); the others are 'delve:<key>'.
const whyOf = (key) => (key === 'warrens' ? 'warrens' : `delve:${key}`);
export function warrensJob(b, m, want = null, owed = null) {
  const P = b.o.game.party;
  if (!P) return null;
  const here = delveOf(m.x, m.z);
  // (On its way through one to a ward gone into from it, the Middle Ward by the Lower: still that. doWarrens, delveWay.)
  const j = b.job, to = j?.kind === 'warrens' && j.delve !== here?.key ? delveByKey(j.delve) : null;
  if (here && to?.within && delveWay(here, to, b.gateOpen)) return j;
  // (And a quest that wants another, through a gate from this one or out and in by its portal: that one. The princess's
  // letter, read in her Garden, is for the Middle Ward.)
  const other = here && want?.length && !want.includes(here.key) ? want.map(delveByKey).find((q) => q && WAYS[q.key] && m.lvl >= q.level && delveWay(here, q, b.gateOpen)) : null;
  if (other) return { kind: 'warrens', why: whyOf(other.key), delve: other.key, say: `On to ${other.name}.` };
  if (here) return { kind: 'warrens', why: whyOf(here.key), delve: here.key, say: `Down ${here.name}.` };
  if (!P.fit()) return null;
  const fit = (d) => WAYS[d.key] && m.lvl >= d.level + (b.bump[whyOf(d.key)] || 0) && !b.skipping(whyOf(d.key));
  const byLevel = DELVES.filter(fit).sort((a, c) => a.level - c.level);
  // (owed: the ones a quest not yet done has work down. Those wait for their quest: src/ui/autobrain.js delveOwed.)
  const d = byLevel.find((q) => want?.includes(q.key)) || (want?.length ? null : byLevel.find((q) => !owed?.has(q.key)));
  return d ? { kind: 'warrens', why: whyOf(d.key), delve: d.key, say: `To ${d.name}, with the party.` } : null;
}

// Room by room: the next one along the way it hasn't been through, waiting for the party before a boss's door, and out by the
// far portal once Venomaw's dead.
export function doWarrens(b, m, foes) {
  const P = b.o.game.party, W = P?.warrens;
  const here = delveOf(m.x, m.z);
  // Down one on its way to another gone into from it (the Middle Ward, up from the Lower): to the gate, and through.
  if (here && b.job?.delve && b.job.delve !== here.key) {
    const to = delveByKey(b.job.delve), at = delveWay(here, to, b.gateOpen);
    if (at) { b.say(`Through ${here.name}, to ${to.name}.`); b.goTo(at[0], at[1], 0.4, true); return; }
  }
  if (!here) {
    const d = delveByKey(b.job?.delve) || DELVES[0];
    // (Out again with it done: no more till it's had a rest from it.)
    if (b.warrensDone) { const key = b.warrensDone; b.warrensDone = false; b.giveUp(whyOf(key), 2400); b.job = null; b.ranDungeon(key); return; }
    b.room = 0;
    // On Dungeon Runs, a portal a long way off is gone to as a player would: the skull's Teleport to Dungeon (src/ui/lands.js
    // goDungeon), which carries the party too. (Once a half minute at most, in case the sim's still to move it.)
    const far = dist(m.x, m.z, d.portal.x, d.portal.z);
    if (b.mode === 'dungeons' && b.allow('aiTeleport') && far > TELEPORT_FAR && P?.fit() && b.t - (b.teleT ?? -99) > 30 && b.o.lands?.goDungeon) {
      b.teleT = b.t;
      b.halt();
      b.say(`Dungeon runs: by the skull to ${d.name}.`);
      b.o.lands.goDungeon(DELVES.indexOf(d));
      return;
    }
    b.say(`To ${d.name}, with the party.`);
    b.goTo(d.portal.x, d.portal.z, 0.6, true);
    return;
  }
  const D = here, way = WAYS[D.key] || [];
  const down = new Set(W?.down || []);
  b.room ??= 0;
  if (down.has(D.last) || !way.length) {
    const [x, z] = toWorld(D.exitOut.x, D.exitOut.z, D);
    b.say(`${D.name} is done: out by the far portal.`);
    b.warrensDone = D.key;
    b.goTo(x, z, 0.5, true);
    return;
  }
  // (After a wipe it's at the way in again: on from where it got to, past what's cleared.)
  if (dist(m.x, m.z, ...toWorld(D.entry.x, D.entry.z, D)) < 6 && b.room > 1 && b.t - (b.roomT || 0) > 20) b.room = 1;
  const id = way[Math.min(b.room, way.length - 1)], r = roomOf(id), [rx, , rz] = roomSpot(id);
  // (A room that's long and not round: by its half length.)
  const R = r.r || Math.max(r.hx || 0, r.hz || 0, r.w || 0, r.h || 0) || 10;
  const boss = BOSSES.find((q) => q.room === id);
  const hostile = foes.some((f) => f.hostile && f.d < 28);
  const d = dist(m.x, m.z, rx, rz);
  // Through it: on to the next once it's quiet there.
  if (d < R * 0.55 && !hostile && (!boss || down.has(boss.key))) { b.room++; b.roomT = b.t; return; }
  // A boss's room: the party gathered and up before it goes in.
  if (boss && !down.has(boss.key) && d < R + 22 && d > R + 2 && !W?.fight) {
    const party = b.o.game.heroTalk?.heroes.filter((h) => P.member(h.p.slot)) || [];
    const ready = party.every((h) => !h.dead && dist(h.x, h.z, m.x, m.z) < 14 && h.hp > 0.85);
    if (!ready || m.hpf < 0.9 || m.mana < m.maxMana * 0.8) {
      b.halt(); b.face = Math.atan2(rx - m.x, rz - m.z);
      b.say(`Gathering the party before ${boss.name}.`);
      return;
    }
  }
  // On to the next room only with the party up and with it: the fallen get up once it's quiet, the tank back on his feet.
  // (Not for ever: twenty seconds, then on.)
  const party = b.party(b.snap);
  const lagging = !hostile && d > R * 0.7 && party.some((h) => h.dead || dist(h.x, h.z, m.x, m.z) > 16 || (h.role === 'tank' && h.hpf < 0.5));
  if (lagging && (b.partyWait = (b.partyWait || 0) + 0.12) < 20) { b.halt(); b.face = null; b.say('Waiting for the party.'); return; }
  if (!lagging) b.partyWait = 0;
  b.say(boss && !down.has(boss.key) ? `In to ${boss.name}.` : `Through ${r.name}.`);
  b.goTo(rx, rz, boss ? R * 0.35 : R * 0.4, !hostile);
}

// The way to go, inside: straight where it's open, else down the caves' own field (the nav thread's grid stops at the edge
// of the world). For walk() in src/ui/autobrain.js.
export function caveStep(b, m, g) {
  const out = b.caveDir || (b.caveDir = new Float32Array(2));
  caveNav(m.x, m.z).flow(out, m.x, m.z, g.x, g.z, b.t);
  return out;
}

// ---- the fights inside ---------------------------------------------------------------------------------------------------

// Where to stand and whom to hit, by the boss's calls. Returns { to: [x, z] | null, run, target: foe | null, why }.
export function tactics(b, m, foes) {
  const P = b.o.game.party, W = P?.warrens;
  const fresh = W && performance.now() - W.at < 1500;
  const f = fresh && inDungeon(m.x, m.z) ? W.fight : null;
  const live = foes.filter((q) => q.hostile && q.d < 34 && !q.slime && !q.tumbler);
  // What the fight itself wants of it just now (src/sim/dungeon.js order): not a step taken (the Dollmaker's music has
  // stopped; a pyre's on it and it's clear of everyone); or somewhere to be at once, whatever's under it (the high rock
  // above the tide, the far side of a pillar, his spotlight, the grave's circle).
  const told = f?.order || null;
  // (Held to a place, or sent somewhere at once, and burning where it is: a step out of the fire first, as a player would.
  // Not if where it's sent is in the same fire.)
  if (told?.still || (told?.to && told.urgent)) {
    const G = b.o.game.perils, burning = (G?.marks || []).filter((h) => h.burn && h.live && !h.soak && edge(h, m.x, m.z) < 0 && !(told.to && edge(h, told.to[0], told.to[1]) < 0));
    const out = burning.length ? wayOut(burning, m.x, m.z, 0.6, (x, z) => caveRoom(x, z) > 0.8) : null;
    if (out) return { to: out, run: true, target: pickTarget(live, f, b, m), why: 'Out of the fire.' };
  }
  if (told?.still) return { to: [m.x, m.z], still: true, target: pickTarget(live, f, b, m), why: 'Not a step.' };
  if (told?.to && told.urgent && dist(m.x, m.z, told.to[0], told.to[1]) > 0.7) return { to: told.to, run: true, target: pickTarget(live, f, b, m), why: 'Where the fight wants me, now.' };
  // Out of whatever's marked, falling, burning or flying at it, first.
  const out = told?.to && told.urgent ? null : perilStep(b, m);
  if (out) return { to: out, run: true, target: pickTarget(live, f, b, m), why: out.wheel ? 'Round with the wheel.' : 'Out of the circle!' };
  // (And somewhere to be when it's clear: a pod to tread flat.)
  if (told?.to) return { to: told.to, run: dist(m.x, m.z, told.to[0], told.to[1]) > 3, target: pickTarget(live, f, b, m), why: 'Where the fight wants me.' };
  if (!f) return { to: null, target: pickTarget(live, null, b, m), why: null };
  const bodies = f.bodies || [];
  const boss = bodies[0];
  // A boss turned on it (src/sim/dungeon.js turnOn: called out, then a few seconds when nothing holds it): behind the tank
  // from it, or out of its reach with no tank up, but not out of its own (REACH), shooting it as it comes.
  const turned = bodies.find((q) => q.turning);
  if (turned && !turned.flying) {
    const tank = b.tankNear(m), away = (from, r) => { const dx = m.x - from.x, dz = m.z - from.z, L = Math.hypot(dx, dz) || 1; return [from.x + dx / L * r, from.z + dz / L * r]; };
    let [tx, tz] = tank ? (() => { const dx = tank.x - turned.x, dz = tank.z - turned.z, L = Math.hypot(dx, dz) || 1; return [tank.x + dx / L * 3.5, tank.z + dz / L * 3.5]; })() : away(turned, REACH - 1.5);
    if (caveRoom(tx, tz) < 0.8) [tx, tz] = away(turned, 6);
    const T = live.find((q) => q.id === turned.id) || pickTarget(live, f, b, m);
    return { to: [tx, tz], run: dist(m.x, m.z, tx, tz) > 3, target: T, why: tank ? 'It turns on me: back behind the tank.' : 'It turns on me: out of its reach.' };
  }
  if (f.boss === 'venomaw' && boss) {
    // In the air, swooping or diving: nothing to stand by. Out of her strips and her circle (above), and at her whelps.
    if (boss.flying && !boss.perch) return { to: null, target: pickTarget(live.filter((q) => q.id !== boss.id), f, b, m) || pickTarget(live, f, b, m), why: null };
    // On her way to her perch, or on it: behind the nearest pillar from it, shooting what's down here.
    if (boss.flying) {
      const hide = hideSpot(m, boss);
      const t = pickTarget(live.filter((q) => q.id !== boss.id), f, b, m);
      return { to: hide, run: true, target: t && caveClear(m.x, m.z, t.x, t.z) ? t : null, why: 'Behind a pillar: Venomaw is in the air.', hide: true };
    }
    // On the ground: off her shoulder, as far out as its spells reach, never before her face, and forward of her flank: her
    // tail takes all behind.
    const rx = Math.cos(boss.yaw), rz = -Math.sin(boss.yaw), side = (m.x - boss.x) * rx + (m.z - boss.z) * rz >= 0 ? 1 : -1;
    let tx = boss.x + rx * side * 7 + Math.sin(boss.yaw) * 2.5, tz = boss.z + rz * side * 7 + Math.cos(boss.yaw) * 2.5;
    if (caveRoom(tx, tz) < 1) { tx = boss.x - rx * side * 7; tz = boss.z - rz * side * 7; }
    return { to: [tx, tz], run: dist(m.x, m.z, tx, tz) > 5, target: pickTarget(live, f, b, m), why: 'At Venomaw\'s side.' };
  }
  // Maldrec sets his shield: nothing gets through it from the front, so round behind him, a spell's reach off, till it's down.
  if (f.boss === 'maldrec' && boss && (boss.ward ?? 1) < 1) {
    let tx = boss.x - Math.sin(boss.yaw) * 7, tz = boss.z - Math.cos(boss.yaw) * 7;
    if (caveRoom(tx, tz) < 1) { tx = boss.x - Math.sin(boss.yaw) * 5; tz = boss.z - Math.cos(boss.yaw) * 5; }
    if (caveRoom(tx, tz) >= 1) return { to: [tx, tz], run: dist(m.x, m.z, tx, tz) > 4, target: pickTarget(live, f, b, m), why: 'Behind Maldrec\'s shield.' };
  }
  if (f.boss === 'twins') {
    const spinner = bodies.find((q) => q.spin);
    if (spinner && dist(m.x, m.z, spinner.x, spinner.z) < 9) {
      const d = dist(m.x, m.z, spinner.x, spinner.z) || 1;
      return { to: [spinner.x + (m.x - spinner.x) / d * 11, spinner.z + (m.z - spinner.z) / d * 11], run: true, target: pickTarget(live, f, b, m), why: 'Away from the whirlwind.' };
    }
  }
  return { to: null, target: pickTarget(live, f, b, m), why: null };
}

// Whether there's anything marked or flying near it that the sim has told of lately (src/sim/perils.js post).
export function perilsNear(b) {
  const G = b.o.game.perils;
  return !!G && performance.now() - G.at < 700 && G.marks.length + G.shots.length > 0;
}

// Out of what monsters mark on the ground and throw, anywhere in the game: where to step to, or null if it's clear where it
// stands. The marks by the same shapes the sim hurts by (src/core/perils.js); a shot about to pass through it, by a step
// across its way; a ring running along the ground, by a jump as it comes.
export function perilStep(b, m) {
  if (!perilsNear(b)) return null;
  const G = b.o.game.perils;
  const open = inDungeon(m.x, m.z) ? (x, z) => caveRoom(x, z) > 0.8 : null;
  const wave = G.marks.find((h) => h.jump && h.live && Math.abs(edge(h, m.x, m.z)) < 1.9);
  if (wave && b.t - (b.waveJump ?? -9) > 0.7) { b.waveJump = b.t; b.o.shared.input[INPUT.JUMP] += 1; }
  // (Not out of one that's to be stood in: a pod, the grave's circle. soak, src/sim/perils.js.)
  // A wheel turning near it (a boss's fire wheel): round with it, in a gap between its arms, near enough the boss in the
  // middle to keep casting at it (everything it casts stops at REACH: src/sim/spells.js). Stepping out of an arm once it's
  // on it, as with any other mark, it was caught by every arm that came round, and the next. The rest of the marks it steps
  // out of as ever, first.
  const late = (performance.now() - G.at) / 1000;
  const marks = G.marks.filter((h) => !h.jump && !h.soak), turning = (h) => h.shape === 'cross' && h.spin;
  const still = marks.filter((h) => !turning(h)), to = wayOut(still, m.x, m.z, 1, open);
  // (Out of one of those, but not into an arm: where the wheels' arms will be by the time it gets there, too.)
  const soon = marks.filter((h) => turning(h) && h.live && dist(m.x, m.z, h.x, h.z) < h.r + 4).map((h) => ({ ...h, yaw: h.yaw + h.spin * (late + 0.4) }));
  if (to && soon.every((h) => edge(h, to[0], to[1]) > 0.4)) return to;
  if (to) return wayOut([...still, ...soon], m.x, m.z, 1, open) || to;
  const wheel = marks.filter(turning).map((h) => [h, dist(m.x, m.z, h.x, h.z)]).sort((a, c) => a[1] - c[1])[0]?.[0];
  if (wheel) {
    const p = wheelSpot(wheel, m.x, m.z, late, { want: REACH - 2.5 });
    if (p && (!open || open(p[0], p[1])) && marks.every((h) => h === wheel || edge(h, p[0], p[1]) > 0.5)) { p.wheel = true; return p; }
  }
  const out = wayOut(marks, m.x, m.z, 1, open);
  if (out) return out;
  // (Where each shot is now: they've flown on since they were told of.)
  let sx = 0, sz = 0;
  for (const q of G.shots) {
    const qx = q.x + q.vx * late, qz = q.z + q.vz * late, rx = m.x - qx, rz = m.z - qz, v2 = q.vx * q.vx + q.vz * q.vz || 1, t = (rx * q.vx + rz * q.vz) / v2;
    if (t < 0 || t > 0.8) continue;
    const ox = rx - q.vx * t, oz = rz - q.vz * t, miss = Math.hypot(ox, oz);
    if (miss > 1.2 + q.r) continue;
    const v = Math.sqrt(v2);
    sx += miss > 0.05 ? ox / miss : -q.vz / v; sz += miss > 0.05 ? oz / miss : q.vx / v;
  }
  if (!sx && !sz) return null;
  const L = Math.hypot(sx, sz) || 1;
  let tx = m.x + sx / L * 2.4, tz = m.z + sz / L * 2.4;
  if (open && !open(tx, tz)) { tx = m.x - sx / L * 2.4; tz = m.z - sz / L * 2.4; }
  return [tx, tz];
}

// The add first (a digger, a whelp); then anything of the rank and file on the healer or the others (helpPick in
// src/ui/autobrain.js); of the twins, the healthier; else the boss; else what helps the party, else the nearest.
function pickTarget(live, f, b, m) {
  if (!live.length) return null;
  const help = b?.helpPick(live, m);
  if (f) {
    const adds = new Set((f.adds || []).map((a) => a.id));
    const add = live.filter((q) => adds.has(q.id)).sort((a, c) => a.d - c.d)[0];
    if (add) return add;
    const bosses = new Set((f.bodies || []).map((q) => q.id));
    if (help && !bosses.has(help.T.id)) return help.T;
    // (Of two bosses, the one that takes its blows whole before the one that's covered or warded: the Brothers' cover, the
    // twins' shared pain; then the healthier.)
    const ids = (f.bodies || []).filter((q) => !q.flying).sort((a, c) => (c.ward ?? 1) - (a.ward ?? 1) || c.hp - a.hp).map((q) => q.id);
    for (const id of ids) { const q = live.find((x) => x.id === id); if (q) return q; }
  }
  if (help) return help.T;
  return live.reduce((a, c) => (a.d < c.d ? a : c));
}

// Behind a pillar from her perch (where she breathes from), not the one beside it.
function hideSpot(m, boss) {
  let best = null, bd = Infinity;
  const [sx, sz] = toWorld(PERCH.x, PERCH.z);   // (the Warrens' own: Venomaw's)
  void boss;
  for (const [lx, lz, r] of PILLARS) {
    const [qx, qz] = toWorld(lx, lz);
    const ax = qx - sx, az = qz - sz, L = Math.hypot(ax, az) || 1;
    if (L < 12 || L > 60) continue;
    const hx = qx + ax / L * (r + 1.4), hz = qz + az / L * (r + 1.4);
    if (caveRoom(hx, hz) < 0.6) continue;
    const d = dist(hx, hz, m.x, m.z);
    if (d < bd) { bd = d; best = [hx, hz]; }
  }
  return best;
}

export { BOSS_KEYS, caveFloorY };
