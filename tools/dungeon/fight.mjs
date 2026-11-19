// The party dungeons' fights, played out by the sim itself with no page and no GPU: a party hired at the delve's level (a
// level over it for the player and them: the Warrens at 8, the Deeps at 11, the keep at 15), a player who shoots what the
// party's on and walks out of whatever's marked on the ground, and each pack and boss of the delve fought in turn.
//   node tools/dungeon/fight.mjs                 every pack and boss of every delve (a process for each delve)
//   node tools/dungeon/fight.mjs deeps           one delve's (warrens, blackvigil, deeps, vaults, sporehold, playhouse, kingsbarrow, elder)
//   node tools/dungeon/fight.mjs venomaw 3       one fight (a boss's key, or a pack's), so many times over
//   node tools/dungeon/fight.mjs --still twins   the player stands where they are and never steps out of anything
//   node tools/dungeon/fight.mjs --slow          the player sees each mark and shot half a second late, as a person does
// The player also does what a fight orders of it (src/sim/dungeon.js order: somewhere to be, or not a step), as the hired
// party does: the later four delves' bosses each have such a rule. --still ignores those too.
// It says how long each took, who fell, how much of the player's life went, and what was thrown at them. It fails on an
// error in a tick, or a shape with a bad number in it.
import fs from 'node:fs';
import { FX_FLOATS, INPUT, WEAPONS } from '../../src/core/layout.js';
import { ALL_PACKS, BOSSES, DELVES, WARNINGS, caveClear, caveRoom, roomOf, roomSpot, toWorld } from '../../src/core/dungeon.js';
import { spawnSync } from 'node:child_process';
import { makeCast } from '../../src/core/heroes.js';
import { edge, wayOut } from '../../src/core/perils.js';
import { REACH, SPELLS } from '../../src/sim/spells.js';

const root = new URL('../../', import.meta.url);
const args = process.argv.slice(2);
const still = args.includes('--still'), quiet = args.includes('--quiet'), react = args.includes('--slow') ? 0.5 : 0.12;
const which = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'all';
const times = +(args.find((a) => /^\d+$/.test(a)) || 1);
const DT = 1 / 120;
// Which delve: the one named, or the one the named fight is in; with nothing named, each in a process of its own.
const delve = DELVES.find((d) => d.key === which) || DELVES.find((d) => d.key === (BOSSES.find((b) => b.key === which)?.delve || ALL_PACKS.find((q) => q.key === which)?.delve)) || (which === 'pack' ? DELVES[0] : null);
if (!delve) {
  if (which !== 'all') { console.log(`no delve, boss or pack called ${which}`); process.exit(1); }
  let code = 0;
  for (const d of DELVES) { console.log(`\n==== ${d.name} ====`); code |= spawnSync(process.execPath, [process.argv[1], d.key, ...args.filter((a) => a !== 'all')], { stdio: 'inherit' }).status; }
  process.exit(code);
}
// (LEVEL=90 to see how it goes for a party under the delve's own level.)
const LEVEL = +(process.env.LEVEL || 0) || delve.level + 1;
const PACKS = delve.packs, MINE = BOSSES.filter((b) => b.delve === delve.key);

// ---- the sim, booted as its worker boots it --------------------------------------------------------------------------------
const listeners = [], posted = [];
globalThis.self = { postMessage: (m) => { posted.push(m); if (m.type === 'error') { console.log('SIM ERROR', m.message); process.exitCode = 1; } }, addEventListener: (t, f) => { if (t === 'message') listeners.push(f); } };
const file = (url) => { const p = new URL(String(url).replace(/^file:\/\/base\//, ''), root); return fs.readFileSync(p); };
globalThis.fetch = async (url) => {
  let b;
  try { b = file(url); } catch { return { ok: false, status: 404 }; }
  return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), json: async () => JSON.parse(b.toString()) };
};
const json = (p) => JSON.parse(fs.readFileSync(new URL(p, root)));
const cast = makeCast(json('assets/game/heroes/roster.json'), json('assets/game/heroes/kit.json'), json('assets/game/heroes/names.json'), 8, 7);
await import('../../src/sim/sim.worker.js');
const sim = await new Promise((done) => { for (const f of listeners.slice()) f({ data: { type: 'boot', hz: 120, base: 'file://base/', opening: false, heroes: cast, hour: 12, lean: false, stepped: done } }); });
const send = (m) => { for (const f of listeners) f({ data: m }); };

// ---- a level 8 player and a party of four -----------------------------------------------------------------------------------
const inp = sim.input, p = sim.player, W = sim.warrens, P = sim.perils;
inp[INPUT.VIEW_ASPECT] = 16 / 9;
// (GEAR=1: as if in good gear for its level, a stand-in for what a kitted player brings: half again the power, two fifths
// more life, a third more mana back, a quarter off what's taken.)
const GEAR = !!process.env.GEAR;
inp[INPUT.LEVEL] = LEVEL; inp[INPUT.POWER] = (1 + (LEVEL - 1) * 0.07) * (GEAR ? 1.5 : 1); inp[INPUT.W_LIFE] = (LEVEL - 1) * 8 * (GEAR ? 1.4 : 1); inp[INPUT.MANA_MAX] = Math.round((LEVEL - 1) * 0.5) + (GEAR ? 40 : 0); inp[INPUT.REGEN] = GEAR ? 1.33 : 1;
// (A plain staff in hand: what it fights with when the mana's gone, and how it earns the next spell: STAFF_GIVE.)
inp[INPUT.WEAPON] = WEAPONS.findIndex((w) => w?.id === 'crystal_staff'); inp[INPUT.W_MIN] = 12; inp[INPUT.W_MAX] = 18;
let wand = false, wandT = 0, wandFor = 0;
if (GEAR) inp[INPUT.ARMOR] = 33;   // (ward: a third more than a hundred is a quarter off what's taken)
const tick = () => { sim.step(DT); if (sim.reported) throw new Error('a tick threw'); };
const breathe = () => new Promise((r) => setImmediate(r));
for (let i = 0; i < 10; i++) tick();
for (const cls of ['lancer', 'paladin', 'archer', 'rogue']) {
  const h = sim.heroes.find((x) => x.person.cls === cls && !x.hired && !x.broker);
  if (!h || !sim.heroWorld.hire(h.slot, { level: LEVEL })) throw new Error(`nobody to hire as ${cls}`);
}
const party = sim.heroes.filter((h) => h.hired);
// (TRACE: each call the fight makes, as it's made: a god's words among them.)
if (process.env.TRACE) { const w0 = W.warn.bind(W); W.warn = (id, gap = 0) => { const was = W.warnT.get(id); w0(id, gap); if (W.warnT.get(id) !== was) console.log(`  [${sim.time.toFixed(1)}] ${WARNINGS[id]}`); }; }

// (TRACE: the player's last blows, said when it falls.)
const blows = [];
let seen = 0;
if (process.env.TRACE) {
  const h0 = P.hurt.bind(P), d0 = p.damage.bind(p);
  let tag = '';
  P.hurt = (v, dmg, x, z, knock, blockable, t) => { tag = t || ''; try { return h0(v, dmg, x, z, knock, blockable, t); } finally { tag = ''; } };
  p.damage = (...a) => { const was = p.hp, r = d0(...a); if (p.hp < was) { blows.push(`${sim.time.toFixed(1)} ${tag || 'blow'} ${(was - p.hp).toFixed(0)}`); if (blows.length > 6) blows.shift(); seen += was - p.hp; } return r; };
}

// ---- the player: shoots what the fight's on, and (unless --still) keeps out of what's marked and thrown ----------------------
const FIREBOLT = SPELLS.findIndex((x) => x.key === 'firebolt');
let held = 0, jumps = 0, home = null;
function play(target) {
  const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  let wx = 0, wz = 0, run = false;
  if (!still) {
    // What the fight itself wants of it (src/sim/dungeon.js order): not a step; or somewhere to be, at once (urgent) or
    // when it's clear of what's marked.
    const told = W.order(p), go = told?.to && Math.hypot(told.to[0] - p.x, told.to[1] - p.z) > 0.6 ? told.to : null;
    // (What it's seen: a mark is a moment old before it's noticed.)
    const out = told?.still || (go && told.urgent) ? null : wayOut(P.marks.filter((m) => !m.jump && !m.soak && m.t > react), p.x, p.z, 1, (x, z) => !sim.world.inside(x, z, 0.7));
    // (Told to hold a place or to be somewhere at once, and burning where it is: a step out of the fire first, as a player
    // would. Not if where it's sent is in the same fire.)
    const burning = told?.still || (go && told.urgent) ? P.marks.filter((m) => m.dps > 0 && !m.soak && m.t > m.fuse + react && edge(m, p.x, p.z) < 0 && !(go && edge(m, go[0], go[1]) < 0)) : [];
    const stepOut = burning.length ? wayOut(burning, p.x, p.z, 0.6, (x, z) => !sim.world.inside(x, z, 0.7)) : null;
    if (stepOut) { wx = stepOut[0] - p.x; wz = stepOut[1] - p.z; run = true; }
    else if (told?.still) { /* stood where it is */ }
    else if (go && told.urgent) { wx = go[0] - p.x; wz = go[1] - p.z; run = true; }
    else if (out) { wx = out[0] - p.x; wz = out[1] - p.z; run = true; }
    else if (go) { wx = go[0] - p.x; wz = go[1] - p.z; run = true; }
    else if (told?.to) { /* there: stood on it */ }
    else {
      // A shot about to pass through where it stands: a step across its way.
      for (const q of P.shots) {
        const rx = p.x - q.x, rz = p.z - q.z, v2 = q.vx * q.vx + q.vz * q.vz || 1, t = (rx * q.vx + rz * q.vz) / v2;
        if (t < 0 || t > 0.7 || q.age < react) continue;
        const mx = rx - q.vx * t, mz = rz - q.vz * t, miss = Math.hypot(mx, mz);
        if (miss > 1.1 + q.size) continue;
        const side = miss > 0.05 ? [mx / miss, mz / miss] : [-q.vz / Math.sqrt(v2), q.vx / Math.sqrt(v2)];
        if (sim.world.inside(p.x + side[0] * 2, p.z + side[1] * 2, 0.6)) { side[0] = -side[0]; side[1] = -side[1]; }
        wx += side[0]; wz += side[1]; run = true;
      }
      // A boss turned on it (src/sim/dungeon.js turnOn): back out of its reach, as a player does, till it lets go.
      const turned = W.fight?.turn;
      if (!run && turned && !turned.m.dead && Math.hypot(turned.m.x - p.x, turned.m.z - p.z) < (turned.m.opts.reach || 3) + (turned.m.opts.radius || 1) + 4) { wx = p.x - turned.m.x; wz = p.z - turned.m.z; run = true; }
      if (!run && target) {
        const d = Math.hypot(target.x - p.x, target.z - p.z);
        // (Inside its reach: a spell goes no further than REACH from the eye, src/sim/spells.js, so it fights from there to
        // its target's hide, and no nearer than it must.)
        const hide = target.opts?.radius || 0.5;
        if (d > REACH - 2 + hide * 0.7) { wx = target.x - p.x; wz = target.z - p.z; } else if (d < REACH - 5.5 + hide * 0.7) { wx = p.x - target.x; wz = p.z - target.z; }
      }
      // (Never backed out of the room: a fight walked down the tunnel is let go. Back toward its middle, round whatever's there.)
      if (!run && home && Math.hypot(p.x - home[0], p.z - home[1]) > home[2] - 4) { wx = home[0] - p.x + (target ? (target.z - p.z) * 0.6 : 0); wz = home[1] - p.z - (target ? (target.x - p.x) * 0.6 : 0); }
    }
    // A ring coming along the ground: over it.
    if (P.waveAt(p.x, p.z, 1.5) && p.onGround) { inp[INPUT.JUMP]++; jumps++; }
  }
  let L = Math.hypot(wx, wz);
  // (Never off an edge of its own accord, but where the fight sends it: in the Elder Gods' void nothing's under it. Looked
  // ahead no further than where it's going: a step out of a breath along a narrow ramp is a step, not a stride.)
  const ahead = Math.min(2.2, L + 0.3);
  if (L > 0.05 && !still && !W.order(p)?.urgent && sim.world.inside(p.x + wx / L * ahead, p.z + wz / L * ahead, 0.5)) { wx = 0; wz = 0; L = 0; }
  if (L > 0.05) { wx /= L; wz /= L; inp[INPUT.MOVE_Z] = wx * s + wz * c; inp[INPUT.MOVE_X] = -wx * c + wz * s; } else { inp[INPUT.MOVE_X] = 0; inp[INPUT.MOVE_Z] = 0; }
  inp[INPUT.SPRINT] = run ? 1 : 0;
  if (target) {
    const dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz) || 1;
    inp[INPUT.YAW] = Math.atan2(dx, dz);
    // (At what of it is in reach: a god sixteen metres tall is struck in the leg and the belly, not the heart.)
    inp[INPUT.PITCH] = Math.atan2(target.y + (target.hover || 0) + Math.min((target.meta?.height || 1.6) * 0.5, 3) - (p.y + 1.6), d);
    inp[INPUT.SPELL] = FIREBOLT;
    // Firebolt, gathered half a second, one after another while there's mana for it.
    // Out of mana, the staff, shot after shot, till there's enough for a run of spells again.
    if (sim.casting.mana < 14) wand = true; else if (sim.casting.mana > 60) wand = false;
    if (wand) { inp[INPUT.CAST] = 0; held = 0; wandFor += DT; if ((wandT -= DT) <= 0 && d < REACH) { wandT = 0.9; inp[INPUT.ATTACK]++; } }
    else {
    held += DT;
    if (held < 0.55) { if (inp[INPUT.CAST] === 0 && sim.casting.mana > 14) { inp[INPUT.CAST] = 1; inp[INPUT.CAST_N]++; } } else { inp[INPUT.CAST] = 0; if (held > 0.75) held = 0; }
    }
  } else inp[INPUT.CAST] = 0;
}

function pickTarget(key) {
  // (Whoever the fight says to strike, where it says: the Hollow Brothers' cover.)
  const told = W.focus();
  if (told && !W.adds().length) return told;
  const adds = W.adds().sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
  if (adds[0]) return adds[0];
  const live = sim.tripo.slots().filter((k) => !k.dead && !k.dormant && k.aggro && k.lair?.dungeon && (!key || k.lair.key === key));
  return live.sort((a, b) => (a.flying ? 1 : 0) - (b.flying ? 1 : 0) || b.hp / b.maxHp - a.hp / a.maxHp)[0] || null;
}

// One fight, from its door: who, how long, what it cost.
async function fight(key) {
  const boss = BOSSES.find((b) => b.key === key), pack = boss ? null : PACKS.find((q) => q.key === key) || PACKS[0];
  // (The last fight's bodies out of their slots first: the Warrens only stand again once you've been long gone.)
  for (const l of sim.tripo.lairs) if (l.dungeon) sim.tripo.sleep(l);
  sim.tripo.lairs = sim.tripo.lairs.filter((l) => !l.temp);
  W.resetAll(); P.clear();
  for (const h of party) { if (h.dead) sim.heroWorld.revive(h, 1); h.hp = h.maxHp; }
  p.hp = p.maxHp; sim.casting.mana = sim.casting.maxMana;
  P.tally = { hits: 0, dmg: 0, by: {} }; jumps = 0; blows.length = 0;
  // (What's on the way to a boss is dead by the time you're at its door.)
  if (boss) for (const l of sim.tripo.lairs) if (l.dungeon && !l.bossLair) { sim.tripo.sleep(l); l.state = 'cleared'; }
  const room = roomOf(boss ? boss.room : pack.room), [rx, , rz] = boss ? roomSpot(room.id) : roomSpot(room.id, pack.at?.[0] || 0, pack.at?.[1] || 0);
  if (boss) send({ type: 'warrensDebug', cmd: 'boss', boss: boss.key });
  else {
    send({ type: 'warrensDebug', cmd: 'enter', delve: delve.key });
    for (const l of sim.tripo.lairs) if (l.dungeon && l.key !== pack.key && !l.bossLair) l.state = 'cleared';
    // (Stood a little off the pack, on the side that's the shortest walk from the way in.)
    const [ex, ez] = toWorld(delve.entry.x, delve.entry.z, delve), nav = sim.world.caveNav(rx, rz);
    let best = [rx, rz], bd = Infinity;
    for (let a = 0; a < 6.28; a += 0.2) for (const far of [16, 12, 8]) {
      const qx = rx + Math.sin(a) * far, qz = rz + Math.cos(a) * far;
      // (In sight of it: not the near side of a wall with the pack on the far one.)
      if (caveRoom(qx, qz) < 1.5 || !caveClear(qx, qz, rx, rz, 0.3)) continue;
      const dd = nav.walkDist(qx, qz, ex, ez, sim.time) - far * 2;
      if (dd < bd) { bd = dd; best = [qx, qz]; }
    }
    W.carry(best[0], best[1], Math.atan2(rx - best[0], rz - best[1]));
  }
  home = [rx, rz, room.hx !== undefined ? Math.max(room.hx, room.hz) : room.r];
  wandFor = 0;
  let t = 0, began = -1, maxFx = 0, dry = 0, low = { player: 1, tank: 1 }, fell = new Set(), end = '';
  const lairKey = boss ? boss.key : pack.key, lair = () => sim.tripo.lairs.find((l) => l.key === lairKey);
  const tank = party.find((h) => h.role === 'tank');
  while (t < 600) {
    const target = pickTarget(boss ? null : lairKey);
    // In through the door until something's noticed; then the fight.
    if (!target && began < 0) {
      const dx = rx - p.x, dz = rz - p.z;
      inp[INPUT.YAW] = Math.atan2(dx, dz); inp[INPUT.MOVE_Z] = Math.hypot(dx, dz) > (boss ? room.r * 0.45 : 5) ? 1 : 0; inp[INPUT.MOVE_X] = 0; inp[INPUT.CAST] = 0;
    } else { if (began < 0) began = t; play(target); }
    const hp0 = p.hp; seen = 0;
    tick(); t += DT;
    // (TRACE: life lost that no blow accounts for: a fall, or something that takes it straight off.)
    if (process.env.TRACE && hp0 - p.hp - seen > 1) { blows.push(`${sim.time.toFixed(1)} unseen ${(hp0 - p.hp - seen).toFixed(0)}`); if (blows.length > 6) blows.shift(); }
    if ((sim.tick & 7) === 0) await breathe();
    const c = sim.casting;
    maxFx = Math.max(maxFx, c.n);
    // (FXDEBUG: what fills the frame's shapes, the first time it's all but full.)
    if (process.env.FXDEBUG && c.n >= +(process.env.FXDEBUG) && !globalThis.fxShown) { globalThis.fxShown = true; const h = {}; for (let i = 0; i < c.n; i++) { const k = `${c.data[i * FX_FLOATS + 8]}/${c.data[i * FX_FLOATS + 9]}`; h[k] = (h[k] || 0) + 1; } console.log(`shapes at ${sim.time.toFixed(1)} s (shape/elem): ${JSON.stringify(h)}; bursts ${c.bursts.length}, marks ${P.marks.length}`); }
    for (let k = 0; k < c.n * FX_FLOATS; k++) if (!Number.isFinite(c.data[k])) throw new Error(`a shape with a bad number (shape ${c.data[Math.floor(k / FX_FLOATS) * FX_FLOATS + 8]}, field ${k % FX_FLOATS})`);
    if (began >= 0 && c.mana < 14) dry += DT;   // (no mana for a Firebolt: how much of the fight it could only use its staff)
    low.player = Math.min(low.player, p.hp / p.maxHp); if (tank) low.tank = Math.min(low.tank, tank.hp / tank.maxHp);
    for (const h of party) if (h.dead) fell.add(h.person.cls);
    if (process.env.TRACE && (sim.tick % 600) === 0) { const f = W.fight, b = boss && W.bossBodies(boss.key)[0]; console.log(`  t ${t.toFixed(0)} phase ${f?.phase} stage ${f?.air?.stage || ''} boss ${b ? `${(b.hp / b.maxHp * 100).toFixed(0)}% hit ${(sim.time - (b.playerHitT ?? -99)).toFixed(0)}s ago, y ${(b.y - p.y).toFixed(1)}, mana ${sim.casting.mana.toFixed(0)} st ${b.state} ${b.clip} lift ${(b.hover || 0).toFixed(1)} at ${(b.x - rx).toFixed(0)},${(b.z - rz).toFixed(0)}` : ''} p ${(p.hp / p.maxHp * 100).toFixed(0)}% at ${(p.x - rx).toFixed(0)},${(p.z - rz).toFixed(0)} marks ${P.marks.length} shots ${P.shots.length} party ${party.map((h) => (h.dead ? 'x' : (h.hp / h.maxHp * 100).toFixed(0))).join(' ')}`); }
    if (p.dead) { end = 'the player fell'; if (process.env.TRACE) console.log(`  last blows (of ${p.maxHp.toFixed(0)}): ${blows.join(', ')}`); break; }
    if (boss ? W.down.has(boss.key) : began >= 0 && lair()?.state === 'cleared' && !W.adds().length) { end = 'won'; break; }
    if (!boss && began < 0 && t > 40) { end = 'nothing came'; break; }
    if (began >= 0 && t - began > 20 && boss && !W.fight) { end = 'the fight was let go'; if (process.env.TRACE) console.log(`  let go: inside ${W.inside} player ${Math.hypot(p.x - rx, p.z - rz).toFixed(0)} m from the middle of a room of ${room.r}, party ${party.map((h) => `${h.dead ? 'x' : ''}${Math.hypot(h.x - rx, h.z - rz).toFixed(0)}`).join(' ')}, bosses ${W.bossBodies(boss.key).map((m) => `${m.aggro ? 'on' : 'off'} ${Math.hypot(m.x - rx, m.z - rz).toFixed(0)}`).join(' ')}`); break; }
  }
  inp[INPUT.CAST] = 0; inp[INPUT.MOVE_X] = 0; inp[INPUT.MOVE_Z] = 0;
  const left = boss ? W.bossBodies(boss.key).filter((m) => !m.dead).map((m) => `${Math.round(m.hp / m.maxHp * 100)}%`).join(' ') : '';
  const by = Object.entries(P.tally.by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`${(boss ? boss.name : `pack ${pack.key}`).padEnd(30)} ${(end || 'timed out').padEnd(18)} ${(t - Math.max(began, 0)).toFixed(0).padStart(4)} s  dry ${(dry / Math.max(1, t - Math.max(began, 0)) * 100).toFixed(0)}% staff ${(wandFor / Math.max(1, t - Math.max(began, 0)) * 100).toFixed(0)}%  player low ${(low.player * 100).toFixed(0)}%  tank low ${(low.tank * 100).toFixed(0)}%  fell: ${[...fell].join(' ') || 'nobody'}  hit ${P.tally.hits}x for ${P.tally.dmg.toFixed(0)}  jumps ${jumps}  shapes ${maxFx}${left ? `  left ${left}` : ''}`);
  if (!quiet && by) console.log(`    ${by}`);
  // (Out of the fight before the next.)
  if (p.dead) { inp[INPUT.RESTART]++; for (let i = 0; i < 20; i++) { tick(); await breathe(); } }
  return end;
}

console.log(`${delve.name}, at level ${LEVEL}: ${sim.knights.length} bodies, a party of ${party.map((h) => h.person.cls).join(', ')}; the player ${still ? 'stands still' : react > 0.3 ? 'keeps out of what it can, half a second late' : 'keeps out of what it can'}`);
const list = which === delve.key ? [...PACKS.map((q) => q.key), ...MINE.map((b) => b.key)] : [which === 'pack' ? PACKS[0].key : which];
let lost = 0;
for (let n = 0; n < times; n++) for (const k of list) if ((await fight(k)) !== 'won') lost++;
console.log(lost ? `${lost} of ${list.length * times} not won` : `all ${list.length * times} won`);
process.exit(process.exitCode || 0);
