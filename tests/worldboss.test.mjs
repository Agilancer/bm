// The world bosses (src/core/wilds.js WORLD_BOSSES, src/sim/worldboss.js) and the Heralds of the Elder Dragon Gods among
// them: bodies, moves, calls and grounds from the tables; and on a sim of nothing but a clock and you, a Herald a quest
// wants rising at its own ground once you're near it, going back when you go off, and up again after.
// (The fights themselves are played out live: docs/ROAD-LIFE.md.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BOSS, BOSS_MOVES, BOSS_MOVE_KEYS, HERALDS, WILD, WILD_VARIANTS, WORLD_BOSSES, groundOf, worldBossName } from '../src/core/wilds.js';
import { BOSS_GROUNDS } from '../src/core/boss-grounds.js';
import { MOVES_WB, WorldBosses } from '../src/sim/worldboss.js';
import { withVariants } from '../src/core/tripo-monsters.js';
import { ROUTES, countryAt, waterAt } from '../src/core/lands.js';
import { townDist } from '../src/core/town.js';
import { RULES } from '../src/folk/quests.js';
import { QUESTS } from '../src/folk/lines/quests.js';
import { EV } from '../src/core/layout.js';

const json = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const roster = withVariants({ ...json('../assets/monsters/tripo/roster.json') });

test('every world boss: an old body made huge, moves that work and are called, adds there are, grounds where it rises', () => {
  const countries = new Set(BOSS_GROUNDS.map((g) => g.country || countryAt(g.x, g.z)));
  for (const B of WORLD_BOSSES) {
    const v = WILD_VARIANTS[B.id];
    assert.ok(v && roster[B.id], `${B.key}: no body ${B.id}`);
    assert.ok(v.height >= 5, `${B.key} is only ${v.height} m`);
    for (const k of [...B.deck, ...(B.more || []), ...(B.last || [])]) {
      assert.ok(MOVES_WB[k], `${B.key}: no working for ${k}`);
      assert.ok(BOSS_MOVES[k]?.call && BOSS_MOVE_KEYS.includes(k), `${B.key}: nobody calls ${k}`);
    }
    for (const a of B.adds) assert.ok(roster[a], `${B.key}: no add ${a}`);
    assert.ok(B.countries.some((c) => countries.has(c)), `${B.key} has nowhere to rise`);
    assert.ok(B.lvl >= 4 && B.title, B.key);
  }
  // (Each call is a thing happening and a thing to do: the ticker shows them in two parts.)
  for (const [k, m] of Object.entries(BOSS_MOVES)) if (k !== 'turn') assert.ok(m.call.includes('!'), `${k}: ${m.call}`);
});

// (How far (x, z) is from the nearest of the roads, by their lines: the footpaths, ROUTES' trails, may cross a clearing.)
const roadOff = (x, z) => { let b = 1e18; for (const r of ROUTES) if (!r.trail) for (let i = 0; i + 1 < r.pts.length; i++) { const [ax, az] = r.pts[i], [bx, bz] = r.pts[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); b = Math.min(b, (ax + dx * t - x) ** 2 + (az + dz * t - z) ** 2); } return Math.sqrt(b); };
test('the grounds: off the roads, out of the water and the towns, apart', () => {
  assert.ok(BOSS_GROUNDS.length >= 30);
  for (const g of BOSS_GROUNDS) {
    assert.ok(roadOff(g.x, g.z) > g.r + 20, `${g.key} is on a road`);
    assert.ok(!waterAt(g.x, g.z), `${g.key} is in water`);
    assert.ok(townDist(g.x, g.z) > 300, `${g.key} is in Bellmourn`);
    for (const o of BOSS_GROUNDS) if (o !== g) assert.ok(Math.hypot(o.x - g.x, o.z - g.z) >= 250, `${g.key} and ${o.key} are on top of each other`);
  }
});

test('the four Heralds: one for each Elder Dragon God, each with a quest and a ground of its own, named', () => {
  assert.deepEqual(WORLD_BOSSES.filter((b) => b.god).map((b) => b.god), ['thyrraxis', 'kaldurra', 'morvekh', 'nihvaroth']);
  assert.equal(HERALDS.length, 4);
  for (const key of HERALDS) {
    const ids = Object.keys(RULES).filter((id) => RULES[id].steps.some((s) => s.wboss === key));
    assert.equal(ids.length, 1, `${key}: ${ids.length} quests`);
    const st = RULES[ids[0]].steps.find((s) => s.wboss === key);
    assert.ok(groundOf(st.ground), `${key}: no ground ${st.ground}`);
    assert.ok(QUESTS[ids[0]].journal[0].includes(worldBossName(key).split(',')[0]), `${ids[0]} doesn't name ${worldBossName(key)}`);
  }
  assert.equal(worldBossName('herald_hollow'), 'Umbraxes, Herald of the Hollow Star');
});

test('a Herald a quest wants: risen at its ground once you are near, gone back when you go off, up again after', () => {
  const evs = [];
  const sim = { time: 0, level: 12, player: { x: 0, z: 0, dead: false }, event: (...a) => evs.push(a) };
  const wilds = { tear: null, raid: null, meet: null, note() {}, room: () => 12, drop() {} };
  const WB = new WorldBosses(sim, wilds);
  WB.nextCall = 1e9;                     // (none of the land's own, for this)
  const g = groundOf('bg_downs_1'), i = WORLD_BOSSES.findIndex((b) => b.key === 'herald_gale');
  const run = (s) => { for (let t = 0; t < s; t += 1) { sim.time += 1; WB.step(1); } };
  const rose = () => evs.filter((e) => e[0] === EV.WILD && e[1] === WILD.BOSS_RISE);
  // Far off (Bellmourn's way): wanted, but not risen.
  sim.player.x = g.x - 2500; sim.player.z = g.z;
  WB.setWant([{ key: 'herald_gale', at: 'bg_downs_1', lvl: 12 }]);
  run(60);
  assert.equal(rose().length, 0, 'risen while you were far off');
  // Nearer: up at its own ground, waiting the long wait.
  sim.player.x = g.x - 1200;
  run(5);
  assert.equal(rose().length, 1);
  const [, , bi, x, z, wait] = rose()[0];
  assert.equal(bi, i); assert.equal(x, g.x); assert.equal(z, g.z); assert.equal(wait, BOSS.wantWait);
  assert.ok(WB.fight?.wanted && !WB.fight.on);
  assert.equal(WB.fight.lvl, 12, 'not at the quest\'s level');
  // Gone off: back into the ground; and up again after a while, once you're back.
  sim.player.x = g.x - 2200;
  run(3);
  assert.equal(WB.fight, null);
  assert.ok(evs.some((e) => e[0] === EV.WILD && e[1] === WILD.BOSS_GONE));
  sim.player.x = g.x - 900;
  run(BOSS.wantAgain - 10);
  assert.equal(rose().length, 1, 'up again too soon');
  run(20);
  assert.equal(rose().length, 2);
  // No longer wanted (the quest moved on): never risen for it again.
  WB.fight = null; WB.wantT = 0;
  WB.setWant([]);
  run(300);
  assert.equal(rose().length, 2);
  // (An unknown key or ground is dropped.)
  WB.setWant([{ key: 'nobody', at: 'bg_downs_1' }, { key: 'herald_gale', at: 'nowhere' }]);
  assert.deepEqual(WB.want, []);
});
