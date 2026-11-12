// Auto-play in the Free Company's way (src/ui/party.js) and down the Hollowfang Warrens (src/core/dungeon.js,
// src/sim/dungeon.js): hiring a party at a quartermaster's post, walking the caves room by room with the party gathered, and
// fighting the bosses by their calls: out of the circles and the fire, at the dragon's side, behind a pillar when she flies,
// the adds first, the twins kept even. src/ui/autobrain.js calls in here; this keeps the Warrens' rules in one place.
import { ALL_PACKS, BOSSES, BOSS_KEYS, BROKER_SPOTS, CaveNav, DELVES, PARTY, PERCH, PILLARS, caveClear, caveFloorY, caveRoom, delveByKey, delveOf, inDungeon, roleOf, roomOf, roomSpot, toWorld } from '../core/dungeon.js';
import { hirePrice } from './party.js';
import { edge, wayOut } from '../core/perils.js';
import { INPUT } from '../core/layout.js';

// The level it goes down at, the first time (raised two each time the Warrens beat it three times over), and the level it
// hires a party at (a little before, so it has them for the woods too).
export const WARRENS_LEVEL = 7, HIRE_LEVEL = 6;
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
};
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
]);
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
    for (const r of d.rooms) if (!way.includes(r.id)) out.push(`${d.name}, room ${r.id}: not on the way through, so it never goes there`);
    for (const id of way) if (!d.rooms.some((r) => r.id === id)) out.push(`${d.name}: its way through names a room, ${id}, that isn't there`);
    if (!BOSSES.some((b) => b.key === d.last && b.delve === d.key)) out.push(`${d.name}: no last boss, so it never knows it's done`);
  }
  return out;
}

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
// (A flow field for each dungeon, made when it first walks there.)
const navs = new Map();
const caveNav = (x, z) => { const d = delveOf(x, z) || DELVES[0]; let n = navs.get(d.key); if (!n) navs.set(d.key, n = new CaveNav(d)); return n; };

// ---- hiring ----------------------------------------------------------------------------------------------------------------

// A job to go and hire, if it wants a party and can pay for one: to the nearer quartermaster.
export function hireJob(b, m) {
  const P = b.o.game.party;
  if (!P || P.fit() || m.lvl < HIRE_LEVEL || b.skipping('hire')) return null;
  // (What's still to hire, and what it costs: it keeps a little back.)
  const r = P.roles(), want = PARTY.size - P.members.length;
  const cost = hirePrice(m.lvl + 1) * want;
  if (b.o.pack.purse() < cost + 100) return null;
  const which = dist(m.x, m.z, ...BROKER_SPOTS.portal) < dist(m.x, m.z, ...BROKER_SPOTS.town) ? 'portal' : 'town';
  const [x, z] = BROKER_SPOTS[which];
  void r;
  return { kind: 'hire', why: 'hire', which, x, z, say: `To ${which === 'town' ? 'Aldous Fenn by the square' : 'Captain Vale at the Warrens'}, to hire a party.` };
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
  const offers = (P.offers || []).filter((o) => o.price <= b.o.pack.purse());
  const best = (role) => offers.filter((o) => roleOf(o.cls) === role).sort((x, y) => y.level - x.level)[0];
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
// hasn't just been through. The Warrens keeps its old name among its reasons ('warrens'); the others are 'delve:<key>'.
const whyOf = (key) => (key === 'warrens' ? 'warrens' : `delve:${key}`);
export function warrensJob(b, m, want = null) {
  const P = b.o.game.party;
  if (!P) return null;
  const here = delveOf(m.x, m.z);
  if (here) return { kind: 'warrens', why: whyOf(here.key), delve: here.key, say: `Down ${here.name}.` };
  if (!P.fit()) return null;
  const fit = (d) => WAYS[d.key] && m.lvl >= d.level + (b.bump[whyOf(d.key)] || 0) && !b.skipping(whyOf(d.key));
  const byLevel = DELVES.filter(fit).sort((a, c) => a.level - c.level);
  const d = byLevel.find((q) => want?.includes(q.key)) || (want?.length ? null : byLevel[0]);
  return d ? { kind: 'warrens', why: whyOf(d.key), delve: d.key, say: `To ${d.name}, with the party.` } : null;
}

// Room by room: the next one along the way it hasn't been through, waiting for the party before a boss's door, and out by the
// far portal once Venomaw's dead.
export function doWarrens(b, m, foes) {
  const P = b.o.game.party, W = P?.warrens;
  const here = delveOf(m.x, m.z);
  if (!here) {
    const d = delveByKey(b.job?.delve) || DELVES[0];
    // (Out again with it done: no more till it's had a rest from it.)
    if (b.warrensDone) { const key = b.warrensDone; b.warrensDone = false; b.giveUp(whyOf(key), 2400); b.job = null; b.ranDungeon(key); return; }
    b.say(`To ${d.name}, with the party.`);
    b.room = 0;
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
  if (told?.still) return { to: [m.x, m.z], still: true, target: pickTarget(live, f, b, m), why: 'Not a step.' };
  if (told?.to && told.urgent && dist(m.x, m.z, told.to[0], told.to[1]) > 0.7) return { to: told.to, run: true, target: pickTarget(live, f, b, m), why: 'Where the fight wants me, now.' };
  // Out of whatever's marked, falling, burning or flying at it, first.
  const out = told?.to && told.urgent ? null : perilStep(b, m);
  if (out) return { to: out, run: true, target: pickTarget(live, f, b, m), why: 'Out of the circle!' };
  // (And somewhere to be when it's clear: a pod to tread flat.)
  if (told?.to) return { to: told.to, run: dist(m.x, m.z, told.to[0], told.to[1]) > 3, target: pickTarget(live, f, b, m), why: 'Where the fight wants me.' };
  if (!f) return { to: null, target: pickTarget(live, null, b, m), why: null };
  const bodies = f.bodies || [];
  const boss = bodies[0];
  // A boss turned on it (src/sim/dungeon.js turnOn: called out, then a few seconds when nothing holds it): behind the tank
  // from it, or well out of its reach with no tank up, shooting it as it comes.
  const turned = bodies.find((q) => q.turning);
  if (turned && !turned.flying) {
    const tank = b.tankNear(m), away = (from, r) => { const dx = m.x - from.x, dz = m.z - from.z, L = Math.hypot(dx, dz) || 1; return [from.x + dx / L * r, from.z + dz / L * r]; };
    let [tx, tz] = tank ? (() => { const dx = tank.x - turned.x, dz = tank.z - turned.z, L = Math.hypot(dx, dz) || 1; return [tank.x + dx / L * 3.5, tank.z + dz / L * 3.5]; })() : away(turned, 14);
    if (caveRoom(tx, tz) < 0.8) [tx, tz] = away(turned, 9);
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
    // On the ground: off her shoulder, well out, never before her face, and forward of her flank: her tail takes all behind.
    const rx = Math.cos(boss.yaw), rz = -Math.sin(boss.yaw), side = (m.x - boss.x) * rx + (m.z - boss.z) * rz >= 0 ? 1 : -1;
    let tx = boss.x + rx * side * 13 + Math.sin(boss.yaw) * 4, tz = boss.z + rz * side * 13 + Math.cos(boss.yaw) * 4;
    if (caveRoom(tx, tz) < 1) { tx = boss.x - rx * side * 13; tz = boss.z - rz * side * 13; }
    return { to: [tx, tz], run: dist(m.x, m.z, tx, tz) > 5, target: pickTarget(live, f, b, m), why: 'At Venomaw\'s side.' };
  }
  // Maldrec sets his shield: nothing gets through it from the front, so round behind him, a spell's reach off, till it's down.
  if (f.boss === 'maldrec' && boss && (boss.ward ?? 1) < 1) {
    let tx = boss.x - Math.sin(boss.yaw) * 11, tz = boss.z - Math.cos(boss.yaw) * 11;
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
  const to = wayOut(G.marks.filter((h) => !h.jump && !h.soak), m.x, m.z, 1, open);
  if (to) return to;
  // (Where each shot is now: they've flown on since they were told of.)
  const late = (performance.now() - G.at) / 1000;
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
