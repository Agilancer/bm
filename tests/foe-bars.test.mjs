// A life bar over every enemy's head (src/ui/foebars.js); the only life bar on the interface is a boss's.
//   node --test tests/foe-bars.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BOSS_LIFE, FAR, NEAR, TALL, barHeight, barShown, isBoss } from '../src/ui/foebars.js';
import { C, SLIME_FLOATS, TUMBLER_FLOATS } from '../src/core/layout.js';
import { GROUPS, GROUP_KEYS, TRIPO_KIND } from '../src/core/tripo-monsters.js';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

test('whatever means you harm, or has been hurt, has a bar from far off; what hasn\'t seen you, from nearer', () => {
  assert.ok(barShown(5, FAR - 1, true, 40, 40));
  assert.ok(barShown(5, FAR - 1, false, 30, 40), 'something hurt has no bar');
  assert.ok(barShown(5, NEAR - 1, false, 40, 40), 'an enemy that hasn\'t seen you has no bar');
  assert.ok(!barShown(5, NEAR + 1, false, 40, 40));
  assert.ok(!barShown(5, FAR + 1, true, 40, 40));
  assert.ok(!barShown(5, 3, true, 0, 40), 'the dead keep a bar');
});

test('Tessariel\'s knights are no enemy until one turns on you', () => {
  assert.ok(!barShown(1, 3, false, 100, 100));
  assert.ok(barShown(1, 3, true, 100, 100));
});

test('the bar is over the head: a knight\'s own, the top the sim wrote for a monster, or by its kind', () => {
  assert.ok(Math.abs(barHeight(0, 10, 11.7) - 2.2) < 1e-9);
  assert.ok(Math.abs(barHeight(TRIPO_KIND + 2, 10, 16.2) - 6.5) < 1e-9, 'a dragon\'s bar is in its belly');
  // (No head written: its feet, or nothing.)
  for (const hy of [0, 10, NaN]) assert.ok(barHeight(4, 10, hy) > 5, 'the Hydra\'s bar is at its knees');
  for (const k of [0, 1, 2, 3, 4, 5, 6, 9, 10]) assert.ok(TALL[k] > 1.5, `kind ${k} has no height`);
});

test('only a boss has its life on the interface', () => {
  for (const k of [0, 3, 4, 9, 10]) assert.ok(isBoss(k, 100));
  for (const k of [1, 2, 5, 6]) assert.ok(!isBoss(k, 9999), `kind ${k} is on the interface`);
  // The rank and file of the land aren't; its great beasts are.
  const big = GROUP_KEYS.filter((g) => isBoss(TRIPO_KIND + GROUP_KEYS.indexOf(g), GROUPS[g].hp || 0));
  assert.ok(big.length > 0 && big.length < GROUP_KEYS.length / 2, `${big.length} of ${GROUP_KEYS.length} kinds of monster are bosses`);
  for (const g of big) assert.ok(GROUPS[g].hp >= BOSS_LIFE);
  const main = read('../src/main.js');
  assert.ok(main.includes('!isBoss(snap[o + C.KIND] | 0, snap[o + C.MAX_HP])) continue;'), 'the interface\'s bar isn\'t kept to bosses');
  assert.ok(main.includes('!this.dungeonBoss?.()'), 'two boss bars at once in a dungeon');
  assert.ok(main.includes('this.foeBars?.update(snap,'));
});

test('the sim says how much life a jelly and a tumbler have, and where a monster\'s top is', () => {
  assert.equal(SLIME_FLOATS, 13);
  assert.equal(TUMBLER_FLOATS, 19);
  assert.ok(read('../src/sim/slimes.js').includes('snap[o + 12] = s.dead ? 0'));
  assert.ok(read('../src/sim/tumblers.js').includes('snap[o + 18] = s.dead ? 0'));
  assert.ok(read('../src/sim/beast.js').includes('snap[cOff + C.HEAD_Y] = this.y + (this.meta?.height'));
  assert.ok(C.HEAD_Y > 0);
  // (The bars read the last float of each.)
  const ui = read('../src/ui/foebars.js');
  assert.ok(ui.includes('snap[o + SLIME_FLOATS - 1]') && ui.includes('snap[o + TUMBLER_FLOATS - 1]'));
});

test('the bars are the world\'s, not the interface\'s: auto-play putting the interface away leaves them', () => {
  const bare = read('../src/ui/hud.css').split('\n').find((l) => l.startsWith('body.ui-bare :is('));
  assert.ok(bare && !bare.includes('#foeBars'));
});
