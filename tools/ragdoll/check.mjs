// The ragdoll played out by the sim itself, with no page and no GPU (as tools/wilds/play.mjs does the land):
//   node tools/ragdoll/check.mjs            one of every kind of body killed where it stands, and watched till it lies still
//   node tools/ragdoll/check.mjs tripo 40   more of the Tripo monsters (this many of the roster, spread over it)
// Fails if a body doesn't go limp, goes through the ground, flies off, comes apart, or never comes to rest.
import fs from 'node:fs';
import { INPUT } from '../../src/core/layout.js';
import { makeCast } from '../../src/core/heroes.js';

const root = new URL('../../', import.meta.url);
const DT = 1 / 120;
const listeners = [];
globalThis.self = { postMessage: (m) => { if (m.type === 'error') { console.log('SIM ERROR', m.message); process.exitCode = 1; } }, addEventListener: (t, f) => { if (t === 'message') listeners.push(f); } };
globalThis.fetch = async (url) => {
  let b;
  try { b = fs.readFileSync(new URL(String(url).replace(/^file:\/\/base\//, ''), root)); } catch { return { ok: false, status: 404 }; }
  return { ok: true, status: 200, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), json: async () => JSON.parse(b.toString()) };
};
const json = (p) => JSON.parse(fs.readFileSync(new URL(p, root)));
const cast = makeCast(json('assets/game/heroes/roster.json'), json('assets/game/heroes/kit.json'), json('assets/game/heroes/names.json'), 8, 7);
await import('../../src/sim/sim.worker.js');
const sim = await new Promise((done) => { for (const f of listeners.slice()) f({ data: { type: 'boot', hz: 120, base: 'file://base/', opening: false, heroes: cast, hour: 12, lean: false, stepped: done } }); });
const { TripoMonster } = await import('../../src/sim/tripo.js');
const { Zombie, Caster } = await import('../../src/sim/undead.js');
const { Knight } = await import('../../src/sim/knight.js');
const { Hero } = await import('../../src/sim/hero.js');
const p = sim.player, T = sim.tripo;
sim.input[INPUT.VIEW_ASPECT] = 16 / 9;
const breathe = () => new Promise((r) => setImmediate(r));
const run = async (secs, until) => { for (let i = 0; i < secs * 120; i++) { sim.step(DT); if (sim.reported) throw new Error('a tick threw'); if (i % 120 === 0) { await breathe(); if (until?.()) return true; } } return !until; };
let failed = 0;
const check = (ok, what) => { if (!ok) { console.log(`  FAIL ${what}`); failed++; process.exitCode = 1; } return ok; };
await run(1);

// One body: killed by a blow from the player's side, then watched.
async function kill(k, label) {
  p.hp = p.maxHp;
  const rig = k.pose ? k.pose : k.rig, top0 = Math.max(...Array.from({ length: k.rig.count }, (_, j) => rig.wt[j * 3 + 1]));
  const x0 = k.x, z0 = k.z;
  k.hitX = k.x + 3; k.hitZ = k.z; k.hitF = 40; k.hitAt = sim.time; k.playerHitT = sim.time;
  k.hp = 0;
  if (k.seenHp !== undefined) k.seenHp = 0;     // (the Hydra heals half of a blow that lands on no part of it)
  await run(0.1);
  const rd = k.ragdoll;
  if (!check(!!rd, `${label}: went limp`)) return;
  let low = 1e9, worst = 0, why = '';
  const look = () => {
    for (let i = 0; i < rd.m; i++) {
      const o = i * 3, g = rd.ground(rd.pos[o], rd.pos[o + 2], rd.pos[o + 1]);
      low = Math.min(low, rd.pos[o + 1] - g - rd.rad[i]);
    }
    for (let c = 0; c < rd.ca.length; c++) {
      if (rd.ck[c] !== 0) continue;
      const a = rd.ca[c] * 3, b = rd.cb[c] * 3, d = Math.hypot(rd.pos[a] - rd.pos[b], rd.pos[a + 1] - rd.pos[b + 1], rd.pos[a + 2] - rd.pos[b + 2]);
      const e = Math.abs(d - rd.cd[c]) / Math.max(rd.cd[c], rd.size * 0.05);
      if (e > worst) { worst = e; why = `${k.rig.names[rd.pj[rd.ca[c]]]}~${k.rig.names[rd.pj[rd.cb[c]]]} want ${rd.cd[c].toFixed(3)} was ${d.toFixed(3)} at ${rd.age.toFixed(2)} s, size ${rd.size.toFixed(2)}`; }
    }
  };
  for (let t = 0; t < 10 && !rd.asleep; t += 0.25) { await run(0.25); look(); }
  look();
  if (process.env.WHY) {
    const rows = [];
    for (let c = 0; c < rd.ca.length; c++) { const a = rd.ca[c] * 3, b = rd.cb[c] * 3, d = Math.hypot(rd.pos[a] - rd.pos[b], rd.pos[a + 1] - rd.pos[b + 1], rd.pos[a + 2] - rd.pos[b + 2]); rows.push([rd.ck[c] ? Math.max(0, rd.cd[c] - d) : Math.abs(d - rd.cd[c]), `${k.rig.names[rd.pj[rd.ca[c]]]}~${k.rig.names[rd.pj[rd.cb[c]]]} kind ${rd.ck[c]} want ${rd.cd[c].toFixed(3)} is ${d.toFixed(3)}`]); }
    rows.sort((a, b) => b[0] - a[0]);
    for (const r of rows.slice(0, 6)) console.log('       ' + r[1]);
    console.log('       points: ' + rd.pj.map((j, i) => `${k.rig.names[j].replace(/^mixamorig\d*:/, '')}(${(rd.pos[i * 3 + 1] - rd.gnd[i]).toFixed(2)})`).join(' '));
  }
  const fell = worst; worst = 0; look(); const still = worst; worst = Math.max(fell, still);
  const top1 = Math.max(...Array.from({ length: k.rig.count }, (_, j) => rig.wt[j * 3 + 1]));
  const went = Math.hypot(k.x - x0, k.z - z0), fin = rig.wt.every(Number.isFinite) && rig.wq.every(Number.isFinite);
  const ok = [
    check(fin, `${label}: every joint has a place`),
    check(rd.asleep && rd.age < 9, `${label}: came to rest (${rd.age.toFixed(1)} s)`),
    check(low > -Math.max(0.03, rd.size * 0.012), `${label}: stayed out of the ground (${low.toFixed(3)})`),
    check(worst < 0.5, `${label}: held together as it fell (bones off by ${(worst * 100).toFixed(0)}%: ${why})`),
    check(still < 0.08, `${label}: whole where it lies (bones off by ${(still * 100).toFixed(0)}%)`),
    check(went < rd.size * 3 + 3, `${label}: didn't fly off (${went.toFixed(1)} m)`),
    check(top1 < top0 + 0.3, `${label}: ended no higher than it stood (${top0.toFixed(2)} -> ${top1.toFixed(2)})`),
  ].every(Boolean);
  console.log(`${ok ? '  ok  ' : '  BAD '} ${label}: ${rd.m} points of ${k.rig.count} joints, ${rd.ca.length} holds, at rest in ${rd.age.toFixed(1)} s, top ${top0.toFixed(2)} -> ${top1.toFixed(2)} m, moved ${went.toFixed(2)} m${rd.knees ? ', knees' : ''}`);
}

const to = (x, z) => { p.x = x; p.z = z; p.y = sim.world.height(x, z); };
if (process.argv[2] !== 'tripo') {
  console.log('== one of each ==');
  const seen = new Set();
  for (const k of sim.knights.slice()) {
    const name = k.constructor.name + (k instanceof Zombie && !(k instanceof Caster) && k.scale > 1.2 ? ' (ogre)' : '');
    if (seen.has(name) || k.dead || k.dormant || k instanceof TripoMonster || !k.rig || k instanceof Hero) continue;
    seen.add(name);
    to(k.x + 6, k.z);
    await run(0.5);
    await kill(k, `${name} ${k.opts?.name || k.opts?.model || ''}`.trim());
  }
  // A dead body the ground has taken and given back gets up as it always did.
  const z = sim.knights.find((k) => k instanceof Zombie && !(k instanceof Caster) && k.dead && k.ragdoll);
  if (z) { z.raiseAt(sim, z.x, z.z, null); await run(0.2); check(!z.dead && !z.ragdoll, 'a raised body is no longer limp'); console.log('  ok   a body raised again stands up out of its ragdoll'); }
}
console.log('== Tripo monsters ==');
const want = Number(process.argv[3]) || 14, step = Math.max(1, Math.floor(T.ids.length / want));
to(1900, 900);
for (let i = 0; i < T.ids.length; i += step) {
  for (const k of T.slots()) if (k instanceof TripoMonster) k.hp = 0;
  T.reset();
  await run(0.3);
  T.standHere(i, p.x + 8, p.z + 4);
  let m = null;
  await run(8, () => !!(m = T.slots().find((k) => k instanceof TripoMonster && !k.dead)));
  if (!check(!!m, `${T.ids[i]}: stood up`)) continue;
  m.buried = false;
  await run(1.5);
  await kill(m, T.ids[i]);
}
console.log(failed ? `\n${failed} failed` : '\nall lie still');
process.exit(failed ? 1 : 0);
