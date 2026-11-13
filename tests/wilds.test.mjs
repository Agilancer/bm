// The living land's own rules (src/core/wilds.js, src/core/wilds-data.js). What happens in it is played out by
// `node tools/wilds/play.mjs`, which takes a few minutes; this is what can be told from the tables alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SITES, countryAt, routeDist, waterAt } from '../src/core/lands.js';
import { GROUPS, LAIRS, VARIANTS, withVariants } from '../src/core/tripo-monsters.js';
import { COUNTRY_FACTIONS, COUNTRY_TEARS, FACTIONS, MEETINGS, RAID_TOWNS, TEARS_KINDS, WILD, WILD_VARIANTS, atWar } from '../src/core/wilds.js';
import { SEALS } from '../src/core/sites.js';
import { BATTLES, FINDS, FIND_KINDS, OUTPOSTS, TEAR_SPOTS } from '../src/core/wilds-data.js';
import { MOVES } from '../src/sim/moves.js';

const json = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const base = json('../assets/monsters/tripo/roster.json'), palettes = json('../assets/monsters/tripo/palettes.json');
const roster = withVariants({ ...base });

test('every new kind is made from a model there is, in a palette there is, with tricks that are moves', () => {
  assert.ok(Object.keys(WILD_VARIANTS).length >= 90);
  const names = new Set();
  for (const [id, v] of Object.entries(WILD_VARIANTS)) {
    assert.ok(base[v.src], `${id}: no model ${v.src}`);
    assert.ok(palettes[v.pal], `${id}: no palette ${v.pal}`);
    assert.ok(v.height > 0.4 && v.height < 7, `${id}: ${v.height} m`);
    assert.ok(!names.has(v.name), `${id}: ${v.name} is somebody else's name`); names.add(v.name);
    for (const t of v.tricks || []) assert.ok(MOVES[t.move], `${id}: no move ${t.move}`);
    assert.equal(VARIANTS[id], v);
    // (A new name on the old body, not the old thing again: its size or its colours are its own.)
    assert.ok(v.pal !== 'Base' || Math.abs(v.height - base[v.src].height) > 0.2, `${id} is ${v.src} as it was`);
  }
});

test('every model in the bestiary lives somewhere in the land, as itself or as a new kind', () => {
  const used = new Set();
  for (const l of LAIRS) for (const id of [...(l.boss || []), ...(l.pick || [])]) { used.add(id); if (VARIANTS[id]) used.add(VARIANTS[id].src); }
  for (const v of Object.values(VARIANTS)) used.add(v.src);
  const unused = Object.keys(base).filter((id) => !used.has(id));
  assert.deepEqual(unused, []);
});

test('the factions: everyone in them exists, every one holds an outpost, and each country has several', () => {
  for (const [k, f] of Object.entries(FACTIONS)) {
    for (const id of [...f.rank, ...f.elite, ...f.chief]) assert.ok(roster[id], `${k}: nobody called ${id}`);
    for (const p of f.pal) assert.ok(palettes[p], `${k}: no palette ${p}`);
    assert.ok(OUTPOSTS.some((o) => o.faction === k), `${k} holds nothing`);
    assert.ok(f.places.length >= 2 && f.lvl >= 4 && f.lvl <= 22);
  }
  for (const [c, list] of Object.entries(COUNTRY_FACTIONS)) {
    for (const k of list) assert.ok(FACTIONS[k], `${c}: no faction ${k}`);
    assert.ok(new Set(list.map((k) => FACTIONS[k].side)).size >= 3, `${c} has nobody to fight each other`);
    assert.equal(COUNTRY_TEARS[c].length, 2);
  }
  assert.ok(atWar('goblin', 'dead') && !atWar('dead', 'cult') && !atWar('goblin', 'goblin') && !atWar('goblin', undefined));
});

test("Velscour's forts and towers stand only in his own country, far from every seal and from Tessariel's places", () => {
  const seals = Object.values(SITES).filter((s) => s.portal || s.light), lights = Object.values(SITES).filter((s) => s.light);
  const his = [...OUTPOSTS.filter((o) => FACTIONS[o.faction].v), ...BATTLES.filter((b) => FACTIONS[b.a].v || FACTIONS[b.b].v)];
  assert.ok(his.length >= 10);
  for (const o of his) {
    assert.equal(countryAt(o.x, o.z), 'ashen', `${o.key} is in ${countryAt(o.x, o.z)}`);
    for (const s of seals) assert.ok(Math.hypot(s.x - o.x, s.z - o.z) > 520, `${o.key} is by the seal at ${s.name}`);
    for (const s of lights) assert.ok(Math.hypot(s.x - o.x, s.z - o.z) > 1500, `${o.key} is by ${s.name}`);
  }
  // (And nothing of his is among what a tear lets through, or what's met on the way outside the Waste: src/sim/wilds.js factionsAt.)
  for (const K of TEARS_KINDS) for (const id of [...K.waves, ...K.elite, K.lord, K.colossus]) assert.ok(!/velscour|vigil/.test(id) && !/velscour|possessed_knight/.test(roster[id].src || ''), `${K.key}: ${id}`);
});

test('the land is full: outposts, tears and things to find a walk apart all over it, none on a road or in water', () => {
  assert.ok(OUTPOSTS.length >= 300 && TEAR_SPOTS.length >= 180 && FINDS.length >= 200 && BATTLES.length >= 10, `${OUTPOSTS.length} outposts, ${TEAR_SPOTS.length} tears, ${FINDS.length} finds, ${BATTLES.length} battles`);
  assert.equal(new Set(OUTPOSTS.map((o) => o.key)).size, OUTPOSTS.length);
  assert.ok(OUTPOSTS.filter((o) => o.trail).length >= 120, 'few trails');
  for (const o of OUTPOSTS) {
    assert.ok(Math.hypot(o.x, o.z) > 420 && waterAt(o.x, o.z) === null, o.key);
    if (o.trail) { const e = o.trail[o.trail.length - 1]; assert.ok(Math.hypot(e[0] - o.x, e[1] - o.z) > o.r + 9, `${o.key}'s trail runs into it`); }
  }
  for (const [x, z, k] of TEAR_SPOTS) { assert.ok(TEARS_KINDS[k] && waterAt(x, z) === null); const rd = routeDist(x, z); assert.ok(!rd.road || rd.d > rd.road.w + 8, `a tear on ${rd.road?.name}`); }
  for (const [x, z, k] of FINDS) assert.ok(FIND_KINDS[k] && waterAt(x, z) === null && routeDist(x, z).d > 4);
  // No square kilometre of the land that can be stood on is without something: an outpost, an old lair, a tear or a find.
  const things = [...LAIRS.map((l) => [l.x, l.z]), ...TEAR_SPOTS, ...FINDS];
  let empty = 0, cells = 0;
  for (let x = -5000; x < 5000; x += 1000) for (let z = -5000; z < 5000; z += 1000) { cells++; if (!things.some(([tx, tz]) => tx >= x && tx < x + 1000 && tz >= z && tz < z + 1000)) empty++; }
  assert.ok(empty <= cells * 0.08, `${empty} of ${cells} square kilometres have nothing in them`);
});

test('tears and meetings name people who exist, and the page and the sim count the same', () => {
  for (const K of TEARS_KINDS) { for (const id of [...K.waves, ...K.elite, K.lord, K.colossus]) assert.ok(roster[id], `${K.key}: nobody called ${id}`); for (const p of K.pal) assert.ok(palettes[p]); }
  assert.equal(new Set(Object.values(WILD)).size, Object.keys(WILD).length);
  assert.ok(MEETINGS.length >= 7 && MEETINGS.every((m) => m.w > 0 && m.name));
  for (const g of Object.values(roster)) assert.ok(GROUPS[g.group], `${g.id}: no group`);
  // Every town that's raided is a place, has a seal for the other Tessariels to come out of, and isn't either side's own.
  for (const k of RAID_TOWNS) { assert.ok(SITES[k] && !SITES[k].keep && !SITES[k].light, k); assert.ok(SEALS.some((s) => s.key === k), `${k} has no seal`); }
});
