// Which set of gear dresses each part of the third-person body, for what's worn (src/gfx/bodyskin.js pickSets), and that
// the sets the game ships are whole: listed, their pictures there, each for a real palette.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { SKIN_PARTS, pickSets } from '../src/gfx/bodyskin.js';
import { ROBES, ROBE_PALETTES, ROBE_SETS, ROBE_SHAPES } from '../src/items/items.js';

const all = ['head', 'shoulders', 'chest', 'legs', 'feet'];
const sets = [
  { id: 'crimson_regalia', wears: { palette: 'crimson' }, pieces: all },
  { id: 'night_regalia', wears: { palette: 'night' }, pieces: all },
  { id: 'crimson_hood', wears: { palette: 'crimson', shapes: { head: ['hood'] } }, pieces: ['head', 'chest'] },
  { id: 'relic', wears: { items: ['ash_boots_feet'] }, pieces: ['feet'] },
  { id: 'loose', wears: {}, pieces: all },
];
const slots = (...bases) => Object.fromEntries(bases.map((b) => [ROBES[b].slot, { base: b }]));

test('a piece wears the set made for its palette, part by part', () => {
  assert.deepEqual(pickSets(sets, slots('crimson_pointed_head', 'night_pants_legs')), { head: 'crimson_regalia', legs: 'night_regalia' });
  assert.deepEqual(pickSets(sets, {}), {});
  assert.deepEqual(pickSets(sets, slots('moss_coat_chest')), {}, 'nothing made for moss here: the body stays as it came');
});

test('a set that names shapes wins for those shapes, and only where it has the piece', () => {
  assert.equal(pickSets(sets, slots('crimson_hood_head')).head, 'crimson_hood');
  assert.equal(pickSets(sets, slots('crimson_wide_head')).head, 'crimson_regalia');
  // (It names no chest shapes, so its chest is as good as the regalia's, and it's the later made.)
  assert.equal(pickSets(sets, slots('crimson_coat_chest')).chest, 'crimson_hood');
  assert.equal(pickSets(sets, slots('crimson_boots_feet')).feet, 'crimson_regalia');
});

test('a set made for one item wins for it; a set tied to nothing is never picked', () => {
  assert.equal(pickSets(sets, slots('ash_boots_feet')).feet, 'relic');
  assert.ok(!Object.values(pickSets(sets, slots('ash_curled_feet', 'ash_hood_head'))).includes('loose'));
});

test('a piece of a set of gear wears its own set, and such a set dresses nothing else', () => {
  const gear = [...sets, { id: 'emberwake_rare', rarity: 2, wears: { palette: 'crimson' }, pieces: all }];
  assert.deepEqual(pickSets(gear, { head: { base: 'crimson_pointed_head', set: 'emberwake_rare' }, legs: { base: 'crimson_pants_legs' } }), { head: 'emberwake_rare', legs: 'crimson_regalia' });
  // (A set that's gone from the game: the piece falls back on its palette's.)
  assert.equal(pickSets(gear, { head: { base: 'crimson_pointed_head', set: 'gone' } }).head, 'crimson_regalia');
});

test('other things in the slots are not robes', () => {
  assert.deepEqual(pickSets(sets, { head: { base: 'kite_tree' }, chest: null, main: { base: 'crystal_staff' } }), {});
});

test('the sets in the game are whole', () => {
  const dir = new URL('../assets/game/player/skins/', import.meta.url);
  const { sets: shipped } = JSON.parse(readFileSync(new URL('sets.json', dir)));
  assert.ok(shipped.length >= 5);
  for (const s of shipped) {
    assert.ok(existsSync(new URL(`${s.id}.webp`, dir)), `${s.id}.webp`);
    assert.ok(s.pieces.length && s.pieces.every((p) => SKIN_PARTS.includes(p)), `${s.id}: pieces`);
    if (s.wears.palette) assert.ok(ROBE_PALETTES[s.wears.palette], `${s.id}: palette`);
    for (const [part, shapes] of Object.entries(s.wears.shapes || {})) for (const sh of shapes) assert.equal(ROBE_SHAPES[sh]?.slot, part, `${s.id}: ${sh}`);
  }
  // Every palette the game has is dressed, for a plain robe (a set with a rarity dresses only its own pieces).
  for (const p of Object.keys(ROBE_PALETTES)) assert.ok(shipped.some((s) => s.rarity == null && s.wears.palette === p && SKIN_PARTS.every((q) => s.pieces.includes(q))), `nothing whole for ${p}`);
  // The sets that are gear: each listed for the dice (src/items/robesets.js) as it is here, and whole.
  const gear = shipped.filter((s) => s.rarity != null);
  assert.deepEqual(Object.keys(ROBE_SETS).sort(), gear.map((s) => s.id).sort());
  for (const s of gear) {
    assert.equal(ROBE_SETS[s.id].rarity, s.rarity); assert.equal(ROBE_SETS[s.id].palette, s.wears.palette);
    assert.deepEqual([...s.pieces].sort(), [...SKIN_PARTS].sort(), `${s.id}: all five pieces`);
  }
  // And every palette has a set at every rarity, so a robe asked for by its colour always comes as one.
  for (const p of Object.keys(ROBE_PALETTES)) for (let r = 0; r < 6; r++) assert.ok(gear.some((s) => s.wears.palette === p && s.rarity === r), `${p} at rarity ${r}`);
  assert.ok(existsSync(new URL('../assets/game/player/parts.png', import.meta.url)));
});
