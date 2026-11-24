// The two board throws (src/sim/heroskills.js): the paladin's Blessed Shield goes round every foe on the ground and draws
// none of them onto him; the lancer's Shield Throw taunts what it strikes and breaks into a chain of boards of light, every
// time off his own board, three times in five off each board of the chain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAIN_ON } from '../src/sim/heroskills.js';
import { stage } from './hero-stage.mjs';

// Foes scattered over a patch of ground ahead of him: `n` of them, the nearest `at` metres off, the rest within `r` of it.
function scatter(foes, at, r) {
  foes.forEach((f, i) => {
    const a = i * 2.39996, d = i ? r * Math.sqrt(i / foes.length) : 0;
    f.x = at + Math.sin(a) * d; f.z = Math.cos(a) * d;
  });
}
const ready = (hero, foes) => { hero.foe = foes[0]; hero.gcd = 1e9; for (const q of hero.skills) q.t = 1e9; };
// The boards of the chain in the air (thrown by the lancer, each meant for one foe), counted as they're made.
function counter(w, hero) {
  const seen = new Set();
  return { tick: () => { for (const s of w.shots) if (s.kind === 'x' && s.owner === hero && s.only) seen.add(s); }, get n() { return seen.size; } };
}
const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };

test('Blessed Shield goes round every foe on that ground, then home on his arm', () => {
  const { sim, hero, foes, w, step } = stage('paladin', 30, 10);
  scatter(foes, 7, 7);
  ready(hero, foes);
  step(0.2);
  hero.skill(sim, 'blessed_shield', foes[0]);
  step(12);
  const struck = foes.filter((f) => f.hits > 0).length;
  assert.equal(struck, foes.length, `it struck ${struck} of ${foes.length}`);
  assert.ok(!w.shots.some((s) => s.kind === 'x' && s.owner === hero), 'and it came home');
  assert.ok(!hero.free[1], 'nothing left out of his hands');
});

test('Blessed Shield keeps to its ground: a foe far off across the field is let be', () => {
  const { sim, hero, foes, step } = stage('paladin', 30, 6);
  scatter(foes.slice(0, 5), 6, 4);
  // (A chain of stepping stones away from the fight: each within a hop of the last, all of them off its ground.)
  foes[5].x = 6 + 30; foes[5].z = 0;
  ready(hero, foes);
  step(0.2);
  hero.skill(sim, 'blessed_shield', foes[0]);
  step(10);
  assert.ok(foes.slice(0, 5).every((f) => f.hits > 0), 'every foe on the ground');
  assert.equal(foes[5].hits, 0, 'and not the one far off');
});

test('Blessed Shield draws no one onto the paladin: each stays on whoever it was after', () => {
  const { sim, hero, foes, step } = stage('paladin', 30, 8);
  scatter(foes, 6, 5);
  const tank = { x: 8, y: 0, z: 3, dead: false, hidden: false };
  foes.forEach((f, i) => { if (i % 2) { f.heroFoe = tank; f.heroFoeT = 0; } });
  ready(hero, foes);
  step(0.2);
  hero.skill(sim, 'blessed_shield', foes[0]);
  // (The board away, he's held where he stands: his own sword arm would take whatever it reached, as it should.)
  const keep = () => { for (const f of foes) if (f.heroFoe === tank) f.heroFoeT = sim.time; };
  step(0.8, keep);
  hero.foe = null; hero.hold = 1e9; hero.task = { kind: 'town', peace: true };
  step(10, keep);
  assert.ok(foes.every((f) => f.hits > 0), 'every one struck');
  assert.ok(foes.every((f) => f.heroFoe !== hero && f.tauntBy !== hero), 'none of them his');
  assert.ok(foes.every((f, i) => (i % 2 ? f.heroFoe === tank : !f.heroFoe)), 'each on whoever it was after');
});

test('a hired paladin (a healer) and a plain blow still take what they strike', () => {
  const { sim, hero, foes } = stage('paladin', 30, 2);
  hero.hit(sim, foes[0], 5);
  assert.equal(foes[0].heroFoe, hero, 'an ordinary blow is his');
  hero.hit(sim, foes[1], 5, 'bash', 30, 0, { noAggro: true });
  assert.ok(!foes[1].heroFoe, 'a blow that draws nothing is no one\'s');
});

test('Shield Throw: everything struck is his, and his own board breaks into a chain on every one it strikes', () => {
  const { sim, hero, foes, w, step } = stage('lancer', 30, 10);
  scatter(foes, 6, 6);
  ready(hero, foes);
  step(0.2);
  // (Every board of the chain fails its three in five: only his own board's breaks are left.)
  const c = counter(w, hero);
  withRandom(0.99, () => { hero.skill(sim, 'shield_throw', foes[0]); step(6, c.tick); });
  const first = foes.filter((f) => f.tauntBy === hero);
  assert.ok(first.length >= 2, `the chain struck and taunted ${first.length}`);
  assert.ok(c.n >= 1, 'his board broke into others');
  // Each break of his own board makes up to two; each break of a chain board none, at 0.99.
  const struck = foes.filter((f) => f.hits > 0);
  assert.ok(struck.every((f) => f.tauntBy === hero), 'every foe struck is his');
  assert.ok(struck.every((f) => f.heroFoe === hero), 'and after him');
});

test('Shield Throw: with the chain breaking every time, it runs till every foe near is struck', () => {
  const { sim, hero, foes, w, step } = stage('lancer', 30, 12);
  scatter(foes, 6, 9);
  ready(hero, foes);
  step(0.2);
  const c = counter(w, hero);
  withRandom(0, () => { hero.skill(sim, 'shield_throw', foes[0]); step(8, c.tick); });
  const struck = foes.filter((f) => f.hits > 0).length;
  assert.equal(struck, foes.length, `struck ${struck} of ${foes.length}`);
  assert.ok(foes.every((f) => f.tauntBy === hero), 'all of them his');
  assert.ok(c.n <= 30, `never more than thirty boards (${c.n})`);
  assert.ok(!hero.free[1] && !w.shots.some((s) => s.kind === 'x' && s.owner === hero), 'and every board is down or home');
});

test('Shield Throw: the chain beyond his own board goes on about three times in five', () => {
  // Many casts on a wide field, each board of the chain breaking or not on the dice; how often a chain board breaks.
  let tried = 0, broke = 0;
  for (let k = 0; k < 6; k++) {
    const { sim, hero, foes, w, step } = stage('lancer', 30, 24);
    scatter(foes, 6, 16);
    ready(hero, foes);
    step(0.2);
    const made = new Set();
    hero.skill(sim, 'shield_throw', foes[0]);
    step(8, () => {
      for (const s of w.shots) if (s.kind === 'x' && s.owner === hero && s.only && !made.has(s)) {
        made.add(s);
        const on = s.onHit;
        s.onHit = (m, ss) => { const before = w.shots.length; on(m, ss); tried++; if (w.shots.length > before) broke++; };
      }
    });
  }
  assert.ok(tried >= 20, `enough chain boards struck to tell (${tried})`);
  const f = broke / tried;
  assert.ok(f > CHAIN_ON - 0.25 && f < CHAIN_ON + 0.2, `a chain board broke ${(f * 100).toFixed(0)}% of the time (${broke}/${tried})`);
});
