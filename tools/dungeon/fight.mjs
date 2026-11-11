// The Hollowfang Warrens' fights, played out by the sim itself with no page and no GPU: a level 8 party hired, a player
// who shoots what the party's on and walks out of whatever's marked on the ground, and each pack and boss fought in turn.
//   node tools/dungeon/fight.mjs                 every boss, and a pack
//   node tools/dungeon/fight.mjs venomaw 3       one fight (grubnash, twins, venomaw, pack), so many times over
//   node tools/dungeon/fight.mjs --still twins   the player stands where they are and never steps out of anything
//   node tools/dungeon/fight.mjs --slow          the player sees each mark and shot half a second late, as a person does
// It says how long each took, who fell, how much of the player's life went, and what was thrown at them. It fails on an
// error in a tick, or a shape with a bad number in it.
import fs from 'node:fs';
import { FX_FLOATS, INPUT } from '../../src/core/layout.js';
import { BOSSES, PACKS, caveRoom, roomOf, roomSpot, toWorld } from '../../src/core/dungeon.js';
import { makeCast } from '../../src/core/heroes.js';
import { wayOut } from '../../src/core/perils.js';
import { SPELLS } from '../../src/sim/spells.js';

const root = new URL('../../', import.meta.url);
const args = process.argv.slice(2);
const still = args.includes('--still'), quiet = args.includes('--quiet'), react = args.includes('--slow') ? 0.5 : 0.12;
const which = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'all';
const times = +(args.find((a) => /^\d+$/.test(a)) || 1);
const LEVEL = 8, DT = 1 / 120;

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
inp[INPUT.POWER] = 1 + (LEVEL - 1) * 0.07; inp[INPUT.W_LIFE] = (LEVEL - 1) * 8; inp[INPUT.MANA_MAX] = (LEVEL - 1) * 6; inp[INPUT.REGEN] = 1 + (LEVEL - 1) * 0.04;
const tick = () => { sim.step(DT); if (sim.reported) throw new Error('a tick threw'); };
const breathe = () => new Promise((r) => setImmediate(r));
for (let i = 0; i < 10; i++) tick();
for (const cls of ['lancer', 'paladin', 'archer', 'rogue']) {
  const h = sim.heroes.find((x) => x.person.cls === cls && !x.hired && !x.broker);
  if (!h || !sim.heroWorld.hire(h.slot, { level: LEVEL })) throw new Error(`nobody to hire as ${cls}`);
}
const party = sim.heroes.filter((h) => h.hired);

// ---- the player: shoots what the fight's on, and (unless --still) keeps out of what's marked and thrown ----------------------
const FIREBOLT = SPELLS.findIndex((x) => x.key === 'firebolt');
let held = 0, jumps = 0, home = null;
function play(target) {
  const s = Math.sin(p.yaw), c = Math.cos(p.yaw);
  let wx = 0, wz = 0, run = false;
  if (!still) {
    // (What it's seen: a mark is a moment old before it's noticed.)
    const out = wayOut(P.marks.filter((m) => !m.jump && m.t > react), p.x, p.z, 1, (x, z) => !sim.world.inside(x, z, 0.7));
    if (out) { wx = out[0] - p.x; wz = out[1] - p.z; run = true; }
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
      if (!run && target) {
        const d = Math.hypot(target.x - p.x, target.z - p.z);
        if (d > 19) { wx = target.x - p.x; wz = target.z - p.z; } else if (d < 9) { wx = p.x - target.x; wz = p.z - target.z; }
      }
      // (Never backed out of the room: a fight walked down the tunnel is let go. Back toward its middle, round whatever's there.)
      if (!run && home && Math.hypot(p.x - home[0], p.z - home[1]) > home[2] - 4) { wx = home[0] - p.x + (target ? (target.z - p.z) * 0.6 : 0); wz = home[1] - p.z - (target ? (target.x - p.x) * 0.6 : 0); }
    }
    // A ring coming along the ground: over it.
    if (P.waveAt(p.x, p.z, 1.5) && p.onGround) { inp[INPUT.JUMP]++; jumps++; }
  }
  const L = Math.hypot(wx, wz);
  if (L > 0.05) { wx /= L; wz /= L; inp[INPUT.MOVE_Z] = wx * s + wz * c; inp[INPUT.MOVE_X] = -wx * c + wz * s; } else { inp[INPUT.MOVE_X] = 0; inp[INPUT.MOVE_Z] = 0; }
  inp[INPUT.SPRINT] = run ? 1 : 0;
  if (target) {
    const dx = target.x - p.x, dz = target.z - p.z, d = Math.hypot(dx, dz) || 1;
    inp[INPUT.YAW] = Math.atan2(dx, dz);
    inp[INPUT.PITCH] = Math.atan2(target.y + (target.hover || 0) + (target.meta?.height || 1.6) * 0.5 - (p.y + 1.6), d);
    inp[INPUT.SPELL] = FIREBOLT;
    // Firebolt, gathered half a second, one after another while there's mana for it.
    held += DT;
    if (held < 0.55) { if (inp[INPUT.CAST] === 0 && sim.casting.mana > 14) { inp[INPUT.CAST] = 1; inp[INPUT.CAST_N]++; } } else { inp[INPUT.CAST] = 0; if (held > 0.75) held = 0; }
  } else inp[INPUT.CAST] = 0;
}

function pickTarget(key) {
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
  P.tally = { hits: 0, dmg: 0, by: {} }; jumps = 0;
  // (What's on the way to a boss is dead by the time you're at its door.)
  if (boss) for (const l of sim.tripo.lairs) if (l.dungeon && !l.bossLair) { sim.tripo.sleep(l); l.state = 'cleared'; }
  if (boss) send({ type: 'warrensDebug', cmd: 'boss', n: BOSSES.indexOf(boss) });
  else { send({ type: 'warrensDebug', cmd: 'enter' }); const [x, , z] = roomSpot(pack.room), r = roomOf(pack.room).r; W.carry(x, z + r * 0.75, Math.PI); for (const l of sim.tripo.lairs) if (l.dungeon && l !== sim.tripo.lairs.find((q) => q.key === pack.key) && !l.bossLair) l.state = 'cleared'; }
  const room = roomOf(boss ? boss.room : pack.room), [rx, , rz] = roomSpot(room.id);
  home = [rx, rz, room.r];
  let t = 0, began = -1, maxFx = 0, low = { player: 1, tank: 1 }, fell = new Set(), end = '';
  const lairKey = boss ? boss.key : pack.key, lair = () => sim.tripo.lairs.find((l) => l.key === lairKey);
  const tank = party.find((h) => h.role === 'tank');
  while (t < 600) {
    const target = pickTarget(boss ? null : lairKey);
    // In through the door until something's noticed; then the fight.
    if (!target && began < 0) {
      const dx = rx - p.x, dz = rz - p.z;
      inp[INPUT.YAW] = Math.atan2(dx, dz); inp[INPUT.MOVE_Z] = Math.hypot(dx, dz) > room.r * 0.45 ? 1 : 0; inp[INPUT.MOVE_X] = 0; inp[INPUT.CAST] = 0;
    } else { if (began < 0) began = t; play(target); }
    tick(); t += DT;
    if ((sim.tick & 7) === 0) await breathe();
    const c = sim.casting;
    maxFx = Math.max(maxFx, c.n);
    for (let k = 0; k < c.n * FX_FLOATS; k++) if (!Number.isFinite(c.data[k])) throw new Error(`a shape with a bad number (shape ${c.data[Math.floor(k / FX_FLOATS) * FX_FLOATS + 8]}, field ${k % FX_FLOATS})`);
    low.player = Math.min(low.player, p.hp / p.maxHp); if (tank) low.tank = Math.min(low.tank, tank.hp / tank.maxHp);
    for (const h of party) if (h.dead) fell.add(h.person.cls);
    if (process.env.TRACE && (sim.tick % 600) === 0) { const f = W.fight, b = boss && W.bossBodies(boss.key)[0]; console.log(`  t ${t.toFixed(0)} phase ${f?.phase} stage ${f?.air?.stage || ''} boss ${b ? `${(b.hp / b.maxHp * 100).toFixed(0)}% st ${b.state} ${b.clip} lift ${(b.hover || 0).toFixed(1)} at ${(b.x - rx).toFixed(0)},${(b.z - rz).toFixed(0)}` : ''} p ${(p.hp / p.maxHp * 100).toFixed(0)}% at ${(p.x - rx).toFixed(0)},${(p.z - rz).toFixed(0)} marks ${P.marks.length} shots ${P.shots.length} party ${party.map((h) => (h.dead ? 'x' : (h.hp / h.maxHp * 100).toFixed(0))).join(' ')}`); }
    if (p.dead) { end = 'the player fell'; break; }
    if (boss ? W.down.has(boss.key) : began >= 0 && lair()?.state === 'cleared') { end = 'won'; break; }
    if (began >= 0 && t - began > 20 && boss && !W.fight) { end = 'the fight was let go'; if (process.env.TRACE) console.log(`  let go: inside ${W.inside} player ${Math.hypot(p.x - rx, p.z - rz).toFixed(0)} m from the middle of a room of ${room.r}, party ${party.map((h) => `${h.dead ? 'x' : ''}${Math.hypot(h.x - rx, h.z - rz).toFixed(0)}`).join(' ')}, bosses ${W.bossBodies(boss.key).map((m) => `${m.aggro ? 'on' : 'off'} ${Math.hypot(m.x - rx, m.z - rz).toFixed(0)}`).join(' ')}`); break; }
  }
  inp[INPUT.CAST] = 0; inp[INPUT.MOVE_X] = 0; inp[INPUT.MOVE_Z] = 0;
  const left = boss ? W.bossBodies(boss.key).filter((m) => !m.dead).map((m) => `${Math.round(m.hp / m.maxHp * 100)}%`).join(' ') : '';
  const by = Object.entries(P.tally.by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
  console.log(`${(boss ? boss.name : `pack ${pack.key}`).padEnd(30)} ${(end || 'timed out').padEnd(18)} ${(t - Math.max(began, 0)).toFixed(0).padStart(4)} s  player low ${(low.player * 100).toFixed(0)}%  tank low ${(low.tank * 100).toFixed(0)}%  fell: ${[...fell].join(' ') || 'nobody'}  hit ${P.tally.hits}x for ${P.tally.dmg.toFixed(0)}  jumps ${jumps}  shapes ${maxFx}${left ? `  left ${left}` : ''}`);
  if (!quiet && by) console.log(`    ${by}`);
  // (Out of the fight before the next.)
  if (p.dead) { inp[INPUT.RESTART]++; for (let i = 0; i < 20; i++) { tick(); await breathe(); } }
  return end;
}

console.log(`booted: ${sim.knights.length} bodies, a party of ${party.map((h) => h.person.cls).join(', ')}; the player ${still ? 'stands still' : react > 0.3 ? 'keeps out of what it can, half a second late' : 'keeps out of what it can'}`);
const list = which === 'all' ? ['pack', 'grubnash', 'twins', 'venomaw'] : [which];
for (let n = 0; n < times; n++) for (const k of list) await fight(k === 'pack' ? PACKS[0].key : k);
process.exit(process.exitCode || 0);
