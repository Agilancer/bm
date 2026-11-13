// The living land played out by the sim itself, with no page and no GPU (as tools/dungeon/fight.mjs does the delves):
//   node tools/wilds/play.mjs            everything below
//   node tools/wilds/play.mjs kinds      every new kind of monster stood up and run for a moment
//   node tools/wilds/play.mjs battle     a standing battle: both sides stand, and hurt and kill each other
//   node tools/wilds/play.mjs tear       a tear walked into and fought through to its sealing (the test kills for you)
//   node tools/wilds/play.mjs meet       each kind of meeting stood up and ended
//   node tools/wilds/play.mjs outpost    an outpost found, emptied and paid for
//   node tools/wilds/play.mjs raid       a raid on Thornwick: the raiders, the Tessariels who come to hold it, both waves
//   node tools/wilds/play.mjs walk       ten minutes walked along a road: what was met on the way
// Fails on an error in a tick or anything that didn't happen.
import fs from 'node:fs';
import { EV, INPUT } from '../../src/core/layout.js';
import { makeCast } from '../../src/core/heroes.js';
import { MEETINGS, WILD, WILD_VARIANTS } from '../../src/core/wilds.js';
import { BATTLES, OUTPOSTS, TEAR_SPOTS } from '../../src/core/wilds-data.js';
import { ROUTES } from '../../src/core/lands.js';

const root = new URL('../../', import.meta.url);
const which = process.argv[2] || 'all';
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
const inp = sim.input, p = sim.player, Wd = sim.wilds, T = sim.tripo;
inp[INPUT.VIEW_ASPECT] = 16 / 9; inp[INPUT.ABIL] = 2 | 8;
const events = [];
const ev0 = sim.event.bind(sim);
sim.event = (type, ...a) => { if (type === EV.WILD) events.push(a); return ev0(type, ...a); };
const breathe = () => new Promise((r) => setImmediate(r));
const tick = () => { sim.step(DT); if (sim.reported) throw new Error('a tick threw'); };
const run = async (secs, until) => { for (let i = 0; i < secs * 120; i++) { tick(); if (i % 120 === 0) { await breathe(); if (until?.()) return true; } } return !until; };
const to = (x, z) => { p.x = x; p.z = z; p.y = sim.world.height(x, z); p.hp = p.maxHp; };
const alive = (f = () => true) => T.slots().filter((k) => k instanceof TripoMonster && !k.dead && f(k));
const slay = (list) => { for (const m of list) { m.playerHitT = sim.time; m.hp = 0; } };
const saw = (code, f = () => true) => events.some((e) => e[0] === code && f(e));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`); if (!ok) { failed++; process.exitCode = 1; } };
const fresh = async () => { for (const k of T.slots()) if (k instanceof TripoMonster) k.hp = 0; Wd.reset(); Wd.nextMeet = 1e9; T.reset(); events.length = 0; await run(1); };
await run(1);

if (which === 'all' || which === 'kinds') {
  console.log('\n== every new kind stood up ==');
  to(1900, 900);
  const ids = Object.keys(WILD_VARIANTS);
  let stood = 0;
  for (let i = 0; i < ids.length; i += 6) {
    await fresh();
    const lairs = ids.slice(i, i + 6).map((id, n) => Wd.stand({ tag: 'kind', x: p.x + 14 + n * 5, z: p.z + 10, r: 1, boss: [id], n: 0, tricks: true, side: n % 2 ? 'a' : 'b' }));
    await run(8, () => lairs.every((l) => l.spawned));
    await run(6);
    for (const [n, l] of lairs.entries()) { const m = alive((k) => k.lair === l)[0]; if (m && m.opts.name === WILD_VARIANTS[ids[i + n]].name && Number.isFinite(m.x + m.y + m.hp)) stood++; else console.log('     not stood:', ids[i + n]); }
  }
  check(stood === ids.length, `${stood} of ${ids.length} kinds stand, by their own names`);
}

if (which === 'all' || which === 'battle') {
  console.log('\n== a standing battle ==');
  await fresh();
  const b = BATTLES[0], mine = (k) => k.lair?.battle === b.key;
  to(b.x + 60, b.z);
  await run(20, () => alive(mine).length >= 6);
  const n0 = alive(mine).length, sides = new Set(alive(mine).map((m) => m.lair.side));
  check(n0 >= 6 && sides.size === 2, `${n0} stand, of ${sides.size} sides (${b.a} against ${b.b})`);
  await run(90, () => alive(mine).length <= n0 - 2);
  const hurt = T.slots().filter((k) => k instanceof TripoMonster && mine(k) && k.rivalHitT !== undefined).length;
  check(hurt >= 2, `${hurt} of them have been struck by the other side`);
  check(alive(mine).length < n0, `${n0 - alive(mine).length} dead of each other's blows after ${(sim.time).toFixed(0)} s`);
  check(!alive(mine).some((m) => m.aggro && !m.rival && Math.hypot(m.x - p.x, m.z - p.z) > 40), 'none has come for the player 60 m off');
}

if (which === 'all' || which === 'tear') {
  console.log('\n== a tear ==');
  await fresh();
  to(0, 700);
  Wd.debug(2);
  await run(3);
  check(saw(WILD.TEAR_NEAR), 'an open tear is told of on coming near');
  const s = TEAR_SPOTS[Wd.near];
  to(s[0] + 5, s[1]);
  await run(4, () => !!Wd.tear);
  check(!!Wd.tear, 'walking into it opens it');
  const came = new Set(), most = [0, 0, 0, 0, 0];
  for (let n = 0; n < 60 && Wd.tear; n++) { await run(8, () => !Wd.tear || (!T.loading.has(Wd.tear.lair) && alive((k) => k.lair === Wd.tear.lair).length > 0)); const here = alive((k) => k.lair === Wd.tear?.lair); for (const m of here) came.add(m.opts.name); if (Wd.tear) most[Wd.tear.stage] = Math.max(most[Wd.tear.stage], Wd.tear.lair.spawned); slay(here); await run(2); }
  check(most[1] >= 4 && most[2] >= 4 && most[3] >= 5 && most[4] >= 2, `every wave stood whole (${most.slice(1).join(', ')})`);
  check([...came].some((n) => /THROUGH THE TEAR/.test(n)), `its lord came: ${[...came].find((n) => /THROUGH THE TEAR/.test(n))}`);
  const stages = events.filter((e) => e[0] === WILD.TEAR_STAGE).map((e) => e[2]);
  check(stages.join() === '1,2,3,4', `its waves came in turn (${stages.join()})`);
  check(saw(WILD.TEAR_SEALED, (e) => e[6] === 1), 'it sealed, with the bonus won');
  check(!Wd.isOpen(Wd.sealedAt.keys().next().value), 'and stays shut');
  // Left behind: lost, and its monsters gone.
  Wd.debug(2); await run(3);
  const s2 = TEAR_SPOTS[Wd.near]; to(s2[0] + 5, s2[1]); await run(6, () => alive((k) => k.lair === Wd.tear?.lair).length > 0);
  to(s2[0] + 400, s2[1]); await run(20, () => !Wd.tear);
  check(saw(WILD.TEAR_LOST) && !alive((k) => k.lair?.key.startsWith('wild_tear')).length, 'walked away from, it is lost and what came through is gone');
}

if (which === 'all' || which === 'meet') {
  console.log('\n== meetings ==');
  for (const [i, M] of MEETINGS.entries()) {
    await fresh();
    to(M.road ? 1000 : 1900, M.road ? 300 : 900);
    if (M.road) { const r = ROUTES.find((q) => q.name === 'the Gallows Road'); to((r.pts[0][0] + r.pts[1][0]) / 2, (r.pts[0][1] + r.pts[1][1]) / 2); p.yaw = Math.atan2(r.pts[1][0] - r.pts[0][0], r.pts[1][1] - r.pts[0][1]); }
    Wd.debug(1, i);
    const lairs = Wd.meet?.lairs || [];
    await run(10, () => lairs.every((l) => l.spawned));
    const n = alive((k) => lairs.includes(k.lair)).length;
    let extra = '';
    if (M.key === 'ritual') { await run(MEET_RITUAL() + 4, () => Wd.meet?.risen); extra = Wd.meet?.risen ? ', and what they called rose when nobody stopped them' : ', BUT NOTHING ROSE'; if (!Wd.meet?.risen) failed++; await run(6); }
    if (M.key === 'skirmish' || M.key === 'duel') { await run(40, () => alive((k) => lairs.includes(k.lair)).length < n); extra = `, ${n - alive((k) => lairs.includes(k.lair)).length} dead by each other`; }
    if (M.key === 'duel') console.log('     ' + T.slots().filter((k) => k instanceof TripoMonster && lairs.includes(k.lair)).map((m) => `${m.opts.name} ${Math.round(m.hp)}/${Math.round(m.maxHp)} ai ${m.opts.ai} aggro ${m.aggro} rival ${m.rival ? Math.hypot(m.rival.x - m.x, m.rival.z - m.z).toFixed(0) + ' m' : 'none'} state ${m.state}`).join(' | '));
    for (let k = 0; k < 20 && Wd.meet; k++) { slay(alive((q) => Wd.meet.lairs.includes(q.lair))); await run(2); }
    check(n > 0 && saw(WILD.MEET, (e) => e[1] === i) && saw(WILD.MEET_DONE, (e) => e[1] === i && e[6] > 0), `${M.key}: ${n} stood${extra}; ended and paid`);
  }
}

if (which === 'all' || which === 'outpost') {
  console.log('\n== an outpost ==');
  await fresh();
  const i = OUTPOSTS.findIndex((o) => o.trail), o = OUTPOSTS[i];
  to(o.x + o.r + 30, o.z);
  await run(12, () => alive((k) => k.lair?.key === o.key).length >= 3);
  const n = alive((k) => k.lair?.key === o.key);
  check(n.length >= 3 && n.some((m) => m.boss), `${o.name} (${o.key}): ${n.length} stand, ${n.find((m) => m.boss)?.opts.name} over them`);
  check(saw(WILD.FOUND, (e) => e[1] === i), 'coming on it is told');
  slay(n); await run(5);
  check(saw(WILD.CLEARED, (e) => e[1] === i), 'emptied, it is told and paid for');
}

if (which === 'all' || which === 'colossus') {
  console.log('\n== the third tear sealed: a colossus ==');
  await fresh();
  // (Far out, where the land is hard enough for one; two already sealed.)
  const far = TEAR_SPOTS.map((t, i) => [t, i]).filter(([t, i]) => Math.hypot(t[0], t[1]) > 2600 && Wd.isOpen(i))[0];
  Wd.sealed = 2;
  to(far[0][0] + 40, far[0][1]); await run(3);
  to(far[0][0] + 5, far[0][1]); await run(4, () => !!Wd.tear);
  check(Wd.tear?.colossus === true, 'it is marked for one');
  let big = null;
  for (let n = 0; n < 60 && Wd.tear; n++) { await run(4, () => alive((k) => k.lair === Wd.tear?.lair).length > 0); const b = alive((k) => k.lair === Wd.tear?.lair && k.boss && k.meta.height > 6)[0]; if (b) big = b; slay(alive((k) => k.lair === Wd.tear?.lair)); await run(2); }
  check(!!big, big ? `${big.opts.name} came through, ${big.meta.height} m tall, ${Math.round(big.maxHp)} life` : 'nothing vast came through');
  check(saw(WILD.TEAR_SEALED, (e) => e[7] === 1), 'and its tear sealed as a colossus');
}

if (which === 'all' || which === 'raid') {
  console.log('\n== a raid on Thornwick ==');
  await fresh();
  to(2300, 1480);  // (near Thornwick, not yet by it, and away from whatever the last scene left)
  await run(30);   // (the Tessariels settle into their day)
  Wd.debug(6, 0);
  const R = Wd.raid;
  check(!!R, 'it begins');
  if (R) {
    await run(10, () => R.lair.spawned > 0);
    const n1 = alive((k) => k.lair === R.lair).length, helpers = R.help;
    check(n1 >= 4 && saw(WILD.RAID, (e) => e[3] === 1), `${n1} come down on it (${R.a})`);
    check(helpers.length > 0 && helpers.every((h) => h.task?.wild && Math.hypot(h.x - R.x, h.z - R.z) < R.r + 140), `${helpers.length} Tessariels came out of its seal: ${helpers.map((h) => h.person.name).join(', ')}`);
    const start = alive((k) => k.lair === R.lair).map((m) => Math.hypot(m.x - R.x, m.z - R.z));
    await run(40);
    const now = alive((k) => k.lair === R.lair).map((m) => Math.hypot(m.x - R.x, m.z - R.z));
    check(!now.length || Math.min(...now) < Math.min(...start) - 20, `they march in on it (nearest ${Math.min(...start).toFixed(0)} m, then ${now.length ? Math.min(...now).toFixed(0) + ' m' : 'all dead'})`);
    const met = () => T.slots().filter((k) => k instanceof TripoMonster && k.lair === R.lair && (k.heroFoe || k.heroKill)).length;
    await run(150, () => met() > 0);
    if (process.env.DBG) console.log('raiders', alive((k) => k.lair === R.lair).map((m) => `${Math.round(Math.hypot(m.x - R.x, m.z - R.z))}m aggro ${m.aggro} home ${Math.round(Math.hypot(m.home[0] - R.x, m.home[1] - R.z))}`).join(', '), '| heroes', helpers.map((h) => `${Math.round(Math.hypot(h.x - R.x, h.z - R.z))}m ${h.task && h.task.kind} foe ${!!h.foe} dead ${h.dead}`).join(', '), '| player', Math.round(Math.hypot(p.x - R.x, p.z - R.z)));
    check(met() > 0, `the Tessariels meet them as they come in (${met()} of the raiders, ${Math.round(sim.time)} s in)`);
    for (let k = 0; k < 30 && Wd.raid && Wd.raid.wave === 1; k++) { slay(alive((q) => q.lair === Wd.raid.lair)); await run(2); }
    check(saw(WILD.RAID, (e) => e[3] === 2), 'a second band comes when the first is dead');
    for (let k = 0; k < 30 && Wd.raid; k++) { await run(3, () => alive((q) => q.lair === Wd.raid?.lair).length > 0); slay(alive((q) => q.lair === Wd.raid?.lair)); await run(2); }
    check(saw(WILD.RAID_DONE, (e) => e[6] === 1), 'held, and paid for');
    check(helpers.every((h) => !h.task?.wild), 'the Tessariels who came go home');
  }
}

if (which === 'all' || which === 'walk') {
  console.log('\n== ten minutes up the Gallows Road ==');
  await fresh();
  Wd.nextMeet = 0;
  const r = ROUTES.find((q) => q.name === 'the Gallows Road');
  let seg = 0, met = 0, most = 0;
  to(...r.pts[0]);
  for (let s = 0; s < 600; s++) {
    const [tx, tz] = r.pts[Math.min(seg + 1, r.pts.length - 1)], d = Math.hypot(tx - p.x, tz - p.z);
    if (d < 6 && seg < r.pts.length - 2) seg++;
    p.yaw = Math.atan2(tx - p.x, tz - p.z);
    to(p.x + Math.sin(p.yaw) * 5, p.z + Math.cos(p.yaw) * 5); p.vx = Math.sin(p.yaw) * 5; p.vz = Math.cos(p.yaw) * 5;
    await run(1);
    most = Math.max(most, alive().length);
    if (Wd.meet && !Wd.meet.counted) { Wd.meet.counted = true; met++; }
    if (s % 10 === 9) slay(alive((k) => Math.hypot(k.x - p.x, k.z - p.z) < 40));
  }
  console.log(Wd.log.map((l) => '     ' + l).join('\n'));
  check(met >= 3, `${met} meetings on the way; ${events.filter((e) => e[0] === WILD.FOUND).length} outposts found, ${events.filter((e) => e[0] === WILD.TEAR_NEAR).length} tears seen, ${events.filter((e) => e[0] === WILD.CACHE).length} caches; never more than ${most} alive at once`);
}
function MEET_RITUAL() { return 50; }
console.log(failed ? `\n${failed} FAILED` : '\nall of it happened');
process.exit(process.exitCode || 0);
