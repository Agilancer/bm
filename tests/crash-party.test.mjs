// A browser that closed the game (src/core/lastrun.js) loads lighter, but never with fewer of the other heroes about: the
// party for the Warrens is hired from them (four, with a tank and a healer), and a cast cut to two left no way into a dungeon.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HERO_SLOTS, makeCast } from '../src/core/heroes.js';
import { PARTY, roleOf } from '../src/core/dungeon.js';

const json = (n) => JSON.parse(readFileSync(new URL(`../assets/game/heroes/${n}.json`, import.meta.url), 'utf8'));

test('how many other heroes there are is never cut for a crash', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const at = main.indexOf('const heroCount =');
  const expr = main.slice(at, main.indexOf(';', at));
  assert.ok(at > 0, 'heroCount in src/main.js');
  assert.doesNotMatch(expr, /RUN|light|died/, 'the number of heroes must not depend on how the last run ended');
});

test('the smallest cast the game loads can still hire a party fit for the Warrens, with a choice of class', () => {
  const roster = json('roster'), kit = json('kit'), names = json('names');
  const least = Math.min(HERO_SLOTS.lean, HERO_SLOTS.desktop, 8);   // (8: the 'few' setting)
  assert.ok(least >= PARTY.size);
  for (let seed = 1; seed < 40; seed++) {
    const cast = makeCast(roster, kit, names, least, seed);
    assert.equal(cast.length, least);
    const r = { tank: 0, heal: 0, dps: 0 };
    for (const c of cast) r[roleOf(c.cls)]++;
    assert.ok(r.tank >= 1 && r.heal >= 1 && r.tank + r.heal + r.dps >= PARTY.size, `seed ${seed}: ${JSON.stringify(r)}`);
    // One of every class, so an old companion of any class has a body to come back in.
    assert.equal(new Set(cast.map((c) => c.cls)).size, new Set(roster.map((h) => h.cls)).size, `seed ${seed}`);
  }
});
