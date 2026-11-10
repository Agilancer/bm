// Auto-play in the Free Company's way (src/ui/party.js) and down the Hollowfang Warrens (src/core/dungeon.js,
// src/sim/dungeon.js): hiring a party at a quartermaster's post, walking the caves room by room with the party gathered, and
// fighting the bosses by their calls: out of the circles and the fire, at the dragon's side, behind a pillar when she flies,
// the adds first, the twins kept even. src/ui/autobrain.js calls in here; this keeps the Warrens' rules in one place.
import { BOSSES, BOSS_KEYS, BROKER_SPOTS, CaveNav, ENTRY, EXIT_OUT, PACKS, PARTY, PERCH, PILLARS, PORTAL, ROOMS, caveClear, caveFloorY, caveRoom, inDungeon, roleOf, roomOf, toWorld } from '../core/dungeon.js';
import { hirePrice } from './party.js';

// The level it goes down at, the first time (raised two each time the Warrens beat it three times over), and the level it
// hires a party at (a little before, so it has them for the woods too).
export const WARRENS_LEVEL = 7, HIRE_LEVEL = 6;
// The way through, room by room. (Each pack and boss is in one of these: coverage() below checks every one is.)
export const WAY = ['mouth', 'diggings', 'tallow', 'dig', 'warren', 'feast', 'throne', 'descent', 'lair'];
// What it knows of the Warrens, for coverage(): every pack's and boss's key.
export const KNOWN = new Set(['hf_diggings', 'hf_tallow', 'hf_warren', 'hf_feast', 'hf_descent', 'grubnash', 'twins', 'venomaw']);
export function warrensCoverage() {
  const out = [];
  for (const p of PACKS) {
    if (!KNOWN.has(p.key)) out.push(`Warrens pack ${p.key}: not in KNOWN (src/ui/autowarrens.js)`);
    if (!WAY.includes(p.room)) out.push(`Warrens pack ${p.key}: its room ${p.room} isn't on the WAY through`);
  }
  for (const b of BOSSES) {
    if (!KNOWN.has(b.key)) out.push(`Warrens boss ${b.key}: no fight taught for it (src/ui/autowarrens.js fightBoss)`);
    if (!WAY.includes(b.room)) out.push(`Warrens boss ${b.key}: its room ${b.room} isn't on the WAY through`);
  }
  for (const r of ROOMS) if (!WAY.includes(r.id)) out.push(`Warrens room ${r.id}: not on the WAY through, so it never goes there`);
  return out;
}

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
let nav = null;
const caveNav = () => nav || (nav = new CaveNav());

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
  b.halt();
  b.face = Math.atan2(h.x - m.x, h.z - m.z);
  if ((b.hireWait = (b.hireWait || 0) + 0.12) < 0.6) return;
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

export function warrensJob(b, m) {
  const P = b.o.game.party;
  if (!P) return null;
  const inside = inDungeon(m.x, m.z);
  if (!inside && (!P.fit() || m.lvl < WARRENS_LEVEL + (b.bump['warrens'] || 0) || b.skipping('warrens'))) return null;
  return { kind: 'warrens', why: 'warrens', say: inside ? 'Down the Hollowfang Warrens.' : 'To the Hollowfang Warrens, with the party.' };
}

// Room by room: the next one along the way it hasn't been through, waiting for the party before a boss's door, and out by the
// far portal once Venomaw's dead.
export function doWarrens(b, m, foes) {
  const P = b.o.game.party, W = P?.warrens;
  if (!inDungeon(m.x, m.z)) {
    // (Out again with it done: no more till it's had a rest from it.)
    if (b.warrensDone) { b.warrensDone = false; b.giveUp('warrens', 2400); b.job = null; return; }
    b.say('To the Hollowfang Warrens, with the party.');
    b.room = 0;
    b.goTo(PORTAL.x, PORTAL.z, 0.6, true);
    return;
  }
  const down = new Set(W?.down || []);
  b.room ??= 0;
  if (down.has('venomaw')) {
    const [x, z] = toWorld(EXIT_OUT.x, EXIT_OUT.z);
    b.say('Venomaw is dead: out by the far portal.');
    b.warrensDone = true;
    b.goTo(x, z, 0.5, true);
    return;
  }
  // (After a wipe it's at the way in again: on from where it got to, past what's cleared.)
  if (dist(m.x, m.z, ...toWorld(ENTRY.x, ENTRY.z)) < 6 && b.room > 1 && b.t - (b.roomT || 0) > 20) b.room = 1;
  const id = WAY[Math.min(b.room, WAY.length - 1)], r = roomOf(id), [rx, rz] = toWorld(r.x, r.z);
  const boss = BOSSES.find((q) => q.room === id);
  const hostile = foes.some((f) => f.hostile && f.d < 28);
  const d = dist(m.x, m.z, rx, rz);
  // Through it: on to the next once it's quiet there.
  if (d < r.r * 0.55 && !hostile && (!boss || down.has(boss.key))) { b.room++; b.roomT = b.t; return; }
  // A boss's room: the party gathered and up before it goes in.
  if (boss && !down.has(boss.key) && d < r.r + 22 && d > r.r + 2 && !W?.fight) {
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
  const lagging = !hostile && d > r.r * 0.7 && party.some((h) => h.dead || dist(h.x, h.z, m.x, m.z) > 16 || (h.role === 'tank' && h.hpf < 0.5));
  if (lagging && (b.partyWait = (b.partyWait || 0) + 0.12) < 20) { b.halt(); b.face = null; b.say('Waiting for the party.'); return; }
  if (!lagging) b.partyWait = 0;
  b.say(boss && !down.has(boss.key) ? `In to ${boss.name}.` : `Through ${r.name}.`);
  b.goTo(rx, rz, boss ? r.r * 0.35 : r.r * 0.4, !hostile);
}

// The way to go, inside: straight where it's open, else down the caves' own field (the nav thread's grid stops at the edge
// of the world). For walk() in src/ui/autobrain.js.
export function caveStep(b, m, g) {
  const out = b.caveDir || (b.caveDir = new Float32Array(2));
  caveNav().flow(out, m.x, m.z, g.x, g.z, b.t);
  return out;
}

// ---- the fights inside ---------------------------------------------------------------------------------------------------

// Where to stand and whom to hit, by the boss's calls. Returns { to: [x, z] | null, run, target: foe | null, why }.
export function tactics(b, m, foes) {
  const P = b.o.game.party, W = P?.warrens;
  const fresh = W && performance.now() - W.at < 1500;
  const hz = fresh ? W.hazards : [];
  const f = fresh ? W.fight : null;
  const live = foes.filter((q) => q.hostile && q.d < 34 && !q.slime && !q.tumbler);
  // Out of whatever's falling or burning, first.
  for (const h of hz) {
    const d = dist(m.x, m.z, h.x, h.z);
    if (d > h.r + 0.9) continue;
    const ux = d > 0.05 ? (m.x - h.x) / d : 1, uz = d > 0.05 ? (m.z - h.z) / d : 0;
    let tx = h.x + ux * (h.r + 2.2), tz = h.z + uz * (h.r + 2.2);
    if (caveRoom(tx, tz) < 0.8) { tx = m.x - uz * 4; tz = m.z + ux * 4; }
    return { to: [tx, tz], run: true, target: pickTarget(live, f, b, m), why: 'Out of the circle!' };
  }
  if (!f) return { to: null, target: pickTarget(live, null, b, m), why: null };
  const bodies = f.bodies || [];
  const boss = bodies[0];
  if (f.boss === 'venomaw' && boss) {
    // Up over the hoard: behind the nearest pillar from her, shooting what's down here.
    if (boss.flying) {
      const hide = hideSpot(m, boss);
      const t = pickTarget(live.filter((q) => q.id !== boss.id), f, b, m);
      return { to: hide, run: true, target: t && caveClear(m.x, m.z, t.x, t.z) ? t : null, why: 'Behind a pillar: Venomaw is in the air.', hide: true };
    }
    // On the ground: at her side, well off, never before her face or at her tail.
    const rx = Math.cos(boss.yaw), rz = -Math.sin(boss.yaw), side = (m.x - boss.x) * rx + (m.z - boss.z) * rz >= 0 ? 1 : -1;
    let tx = boss.x + rx * side * 13 - Math.sin(boss.yaw) * 2, tz = boss.z + rz * side * 13 - Math.cos(boss.yaw) * 2;
    if (caveRoom(tx, tz) < 1) { tx = boss.x - rx * side * 13; tz = boss.z - rz * side * 13; }
    return { to: [tx, tz], run: dist(m.x, m.z, tx, tz) > 5, target: pickTarget(live, f, b, m), why: 'At Venomaw\'s side.' };
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
    const ids = (f.bodies || []).filter((q) => !q.flying).sort((a, c) => c.hp - a.hp).map((q) => q.id);
    for (const id of ids) { const q = live.find((x) => x.id === id); if (q) return q; }
  }
  if (help) return help.T;
  return live.reduce((a, c) => (a.d < c.d ? a : c));
}

// Behind a pillar from her perch (where she breathes from), not the one beside it.
function hideSpot(m, boss) {
  let best = null, bd = Infinity;
  const [sx, sz] = toWorld(PERCH.x, PERCH.z);
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
