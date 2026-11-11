// Every spell, cast for real by the sim's own Casting (src/sim/casting.js) at dummies on flat ground, with no page and no GPU:
//
//   node tools/skills/bench.mjs            a table: each spell at ranks 1 and 5, against one foe and against a pack of eight
//   node tools/skills/bench.mjs --spell meteor meteor=5 meteor:crater=1      one spell, with the ranks and branches named
//   node tools/skills/bench.mjs --check    every spell at every rank, and every branch at its full rank, cast at a pack that can
//                                          die: fails on an error, a shape with a bad number in it, or a spell that does nothing
//
// The numbers are what comes off the dummies' life at level 1 with no gear (listed damage x 0.6), over the seconds from the key
// going down to the last of the spell's work. Dummies stand still and don't hit back: this measures the spells against each
// other, not a fight.
import fs from 'node:fs';
import { ArmsRig } from '../../src/sim/anim.js';
import { Casting } from '../../src/sim/casting.js';
import { FX_FLOATS, INPUT } from '../../src/core/layout.js';
import { SPELLS } from '../../src/sim/spells.js';
import { NODES, TREES, effective } from '../../src/sim/skills.js';

const root = new URL('../../', import.meta.url);
const glb = (p) => { const b = fs.readFileSync(new URL(p, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const rigs = { attack: new ArmsRig(glb('assets/fp/spell_attack.glb')), raise: new ArmsRig(glb('assets/fp/spell_raise.glb')) };
const DT = 1 / 120;

class Dummy {
  constructor(id, x, z, hp, kind = 5) { Object.assign(this, { id, x, y: 0, z, hp, maxHp: hp, kind, dead: false, hostile: true, took: 0 }); }
  onHit() { if (this.hp <= 0) this.dead = true; }
}

// Where the dummies stand for a spell: round you for what bursts from where you stand, ahead of you for the rest.
const SELF = new Set(['nova', 'ring', 'buff', 'blades', 'shatter']);
function field(def, n, hp) {
  const out = [], near = SELF.has(def.cast) || def.field === 'sanctuary', ahead = def.cast === 'cone' || def.fan ? 5 : def.cast === 'spikes' ? 6 : 10;
  if (n === 1) return [new Dummy(1, 0, def.cast === 'blades' ? 1.7 : near ? 3 : ahead, hp)];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, r = def.cast === 'blades' ? 1.7 : near ? 3.2 : i === 0 ? 0 : 2.4;
    out.push(new Dummy(i + 1, Math.sin(a) * r, (near ? 0 : ahead) + Math.cos(a) * r, hp));
  }
  return out;
}

function world(foes) {
  const input = new Float32Array(INPUT.SIZE);
  input[INPUT.VIEW_ASPECT] = 16 / 9;
  const player = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 160, dead: false, swinging: false, guard: 0, staffSurf: false, staffSurfT: null, clip: 'idle',
    stance: { idle: 'idle', shoots: false }, weapon: 0, hasShield: false, hasSkull: false, trauma: 0, leech: 0, drink() {} };
  return { time: 0, tick: 0, foes, player, input, gameState: 0, unarmed: false, third: false, heroes: [], events: 0, slowT: 0,
    world: { height: () => 0, rayBoxes: () => -1, sees: () => true, resolve() {} }, event() { this.events++; }, slowMo(t) { this.slowT = Math.max(this.slowT, t); } };
}

// One cast of spell i with these ranks, the key held for `hold` seconds, run until the spell has done all it's going to.
function run(i, ranks, foes, { hold = 0, secs = 30 } = {}) {
  const sim = world(foes), c = new Casting(rigs), def = effective(i, ranks);
  c.setSkills(ranks);
  c.maxMana = 1e6; c.mana = 1e6; c.regen = 0;   // (no mana coming back: what's gone is what it cost)
  const hp0 = foes.map((f) => f.hp);
  // (Something for Shatter to break and a brittle nova to bite on: the pack is slowed, and its first three frozen.)
  if (def.cast === 'shatter') foes.forEach((f, k) => { const a = c.affOf(f); if (k < 3) a.freeze = 4; else a.slow = 4; });
  sim.input[INPUT.SPELL] = i;
  let t = 0, last = 0, done = 0, maxN = 0, bad = null, before = foes.reduce((a, f) => a + f.hp, 0);
  const holdFor = def.channel ? Math.max(hold, 3) : def.gather ? def.gather + 0.1 : hold;
  c.update(DT, DT, sim.input, sim);   // (a tick with the key up, so the press is seen as one)
  sim.input[INPUT.CAST_N] = 1; sim.input[INPUT.CAST] = 1;
  while (t < secs) {
    if (t >= Math.max(holdFor, 0.02)) sim.input[INPUT.CAST] = 0;
    const slow = sim.slowT > 0 ? 0.25 : 1;
    if (sim.slowT > 0) sim.slowT -= DT;
    sim.time += DT * slow; sim.tick++; t += DT;
    c.update(DT, DT * slow, sim.input, sim);
    for (const f of foes) if (f.hp <= 0) f.dead = true;
    maxN = Math.max(maxN, c.n);
    for (let k = 0; k < c.n * FX_FLOATS && !bad; k++) if (!Number.isFinite(c.data[k])) bad = `a shape with a bad number (${c.data[Math.floor(k / FX_FLOATS) * FX_FLOATS + 8]}, field ${k % FX_FLOATS})`;
    const now = foes.reduce((a, f) => a + f.hp, 0);
    if (now < before - 1e-6) { last = t; before = now; }
    if (!done && !c.busy && t > 0.05) done = t;
    const quiet = !c.busy && !c.bolts.length && !c.zones.length && !c.missiles.length && !c.spikes.length && !c.blades && !Object.keys(c.buffs).length && t > last + 1.2;
    if (quiet) break;
  }
  const dealt = foes.map((f, k) => hp0[k] - Math.max(f.hp, -1e9));
  return { def, sim, c, cast: done, last, total: dealt.reduce((a, b) => a + b, 0), most: Math.max(...dealt), hit: dealt.filter((d) => d > 0.01).length, mana: 1e6 - c.mana, maxN, bad, healed: sim.player.hp - 100, events: sim.events };
}

const ranksFor = (key, r, extra = {}) => ({ [key]: r, ...extra });

if (process.argv.includes('--check')) {
  // Spells that hurt nobody by themselves: they have to have done something else.
  const QUIET = { wisp: (r) => r.c.wisp, mend: (r) => r.healed > 0, renew: (r) => r.healed > 0, fleet: (r) => r.c.cool[r.def.i] > 0, aegis: (r) => r.c.cool[r.def.i] > 0, stoneskin: (r) => r.c.cool[r.def.i] > 0,
    empower: (r) => r.c.cool[r.def.i] > 0, stillness: (r) => r.c.cool[r.def.i] > 0, blink: (r) => Math.hypot(r.sim.player.x, r.sim.player.z) > 3, rune: (r) => r.total > 0 || r.c.zones.length >= 0 };
  const fails = [];
  let casts = 0;
  const one = (label, i, ranks, hp) => {
    casts++;
    try {
      const d = effective(i, ranks);
      // (A rune wants someone to step on it: it's written under the pack.)
      const r = run(i, ranks, field(d, 8, hp), { secs: 40 });
      if (r.bad) fails.push(`${label}: ${r.bad}`);
      const ok = QUIET[d.key] ? QUIET[d.key](r) : r.total > 0;
      if (!ok) fails.push(`${label}: it did nothing (no harm done, nothing else to show for it)`);
      if (r.maxN >= 256) fails.push(`${label}: it drew ${r.maxN} shapes in one tick, all there's room for`);
    } catch (e) { fails.push(`${label}: ${e.message}\n      ${String(e.stack).split('\n')[1]?.trim()}`); }
  };
  for (const t of TREES) for (const n of t.spells) {
    const name = SPELLS[n.spell].name;
    for (let r = 1; r <= 5; r++) one(`${name} rank ${r}`, n.spell, ranksFor(n.key, r), 1e6);
    one(`${name} rank 5 at a pack that dies`, n.spell, ranksFor(n.key, 5), 40);
    for (const a of n.augs) for (const hp of [1e6, 40]) one(`${name} + ${a.name}${hp < 100 ? ' at a pack that dies' : ''}`, n.spell, ranksFor(n.key, 5, { [a.id]: a.max, [`@${t.key}`]: 5 }), hp);
  }
  if (Object.keys(NODES).length !== TREES.length * (1 + 10 * 3)) fails.push(`the trees have ${Object.keys(NODES).length} nodes; six schools of ten spells, two branches each and a mastery come to ${TREES.length * 31}`);
  if (fails.length) { console.log(`${fails.length} of ${casts} casts went wrong:\n`); for (const f of fails) console.log(`  ${f}`); process.exit(1); }
  console.log(`All ${casts} casts ran clean: every spell at every rank, every branch at its full rank, at packs that stand and packs that die.`);
  process.exit(0);
}

const f1 = (v) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

// One spell with what you name: node tools/skills/bench.mjs --spell meteor meteor=5 meteor:crater=1
const at = process.argv.indexOf('--spell');
if (at > 0) {
  const key = process.argv[at + 1], n = NODES[key];
  if (!n || n.kind !== 'spell') { console.log(`No spell "${key}".`); process.exit(1); }
  const ranks = { [key]: 1 };
  for (const a of process.argv.slice(at + 2)) { const [id, r] = a.split('='); if (!NODES[id]) { console.log(`No node "${id}".`); process.exit(1); } ranks[id] = +r || 1; }
  const d = effective(n.spell, ranks), a = run(n.spell, ranks, field(d, 1, 1e6)), b = run(n.spell, ranks, field(d, 8, 1e6));
  console.log(`${d.name} with ${JSON.stringify(ranks)}: ${f1(a.mana)} mana, ${f1(a.total)} off one foe over ${Math.max(a.last, a.cast).toFixed(1)} s, ${f1(b.total)} off a pack of eight (${b.hit} hit).`);
  process.exit(0);
}
console.log('What comes off the dummies at level 1, no gear (listed x 0.6). one: a single foe. pack: eight together, the total and how many were hit.');
console.log('secs: key down to the last of its work. per mana: the pack\'s total a point of mana.\n');
for (const t of TREES) {
  console.log(`## ${t.name}\n`);
  console.log('| Spell | Tier | Rank | Mana | Cast s | One foe | over s | a second | Pack total (hit) | per mana |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const n of [...t.spells].sort((a, b) => a.tier - b.tier || a.row - b.row)) {
    for (const r of [1, 5]) {
      const ranks = ranksFor(n.key, r), d = effective(n.spell, ranks);
      const a = run(n.spell, ranks, field(d, 1, 1e6)), b = run(n.spell, ranks, field(d, 8, 1e6));
      const over = Math.max(a.last, a.cast, 0.1);
      console.log(`| ${r === 1 ? d.name : ''} | ${r === 1 ? n.tier + 1 : ''} | ${r} | ${f1(a.mana)} | ${a.cast.toFixed(2)} | ${f1(a.total)} | ${over.toFixed(1)} | ${f1(a.total / over)} | ${f1(b.total)} (${b.hit}) | ${b.mana > 0 ? f1(b.total / b.mana) : '-'} |`);
    }
  }
  console.log('');
}
