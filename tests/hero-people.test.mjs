// The owner's say over the other Tessariels (assets/game/heroes/people.json, set in heroes.html): names, guilds and
// armour colours reach the cast, the rest is still the seed's, and the dyes do what they say.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeCast } from '../src/core/heroes.js';
import { DYE_SLOTS, applyDye, cleanColours, slotMask } from '../src/core/herodye.js';

const read = (f) => JSON.parse(fs.readFileSync(new URL(`../assets/game/heroes/${f}`, import.meta.url)));
const roster = read('roster.json'), kit = read('kit.json'), names = read('names.json');

test('people.json is well formed and names real bodies', () => {
  const people = read('people.json');
  const bodies = new Set(roster.map((h) => h.id));
  assert.equal(typeof people.heroes, 'object');
  for (const [id, p] of Object.entries(people.heroes)) {
    assert.ok(bodies.has(id), `${id} isn't in roster.json`);
    for (const slot of Object.keys(p.colours || {})) assert.ok(DYE_SLOTS.includes(slot), `${id}: ${slot} isn't a slot`);
  }
});

test('a name, an epithet, a guild and colours set for a body are theirs, and nobody else changes', () => {
  const plain = makeCast(roster, kit, names, 16, 1234);
  const [a, b, c] = plain;
  const people = { heroes: {
    [a.body]: { name: 'Bram', epithet: 'of Hollin', guild: 'The Lantern Watch', colours: { chest: { hue: 210, cover: 'all' } } },
    [b.body]: { guild: '' },
  } };
  const cast = makeCast(roster, kit, names, 16, 1234, people);
  assert.equal(cast[0].name, 'Bram');
  assert.equal(cast[0].full, 'Bram of Hollin');
  assert.equal(cast[0].guild, 'The Lantern Watch');
  assert.deepEqual(cast[0].colours, { chest: { hue: 210, cover: 'all' } });
  assert.equal(cast[1].guild, '');
  assert.equal(cast[1].name, b.name, 'a guild alone leaves the name to the seed');
  assert.equal(cast[2].full, c.full);
  for (let i = 2; i < cast.length; i++) assert.equal(cast[i].guild, plain[i].guild);
  assert.ok(!cast.slice(1).some((h) => h.name === 'Bram'), 'a chosen name is nobody else\'s');
});

test('the dyes: a slot takes its colour, the others and the skin stay', () => {
  // Two triangles over a 40x20 picture: the left half is the chest, the right half the legs. (A slot's own hue is found
  // from its dyed texels, so there have to be a fair few of them.)
  const W = 40, Hh = 20;
  const pieces = [{ name: 'chest_x', tstart: 0, tcount: 1 }, { name: 'legs_x', tstart: 1, tcount: 1 }];
  const uv = new Float32Array([0, 0, 0.5, 0, 0, 1, 0.5, 0, 1, 0, 1, 1]);
  const idx = new Uint32Array([0, 1, 2, 3, 4, 5]);
  const mask = slotMask(pieces, uv, idx, W, Hh, 0);
  const at = (x, y) => (y * W + x) * 4;
  assert.equal(mask[0], DYE_SLOTS.indexOf('chest') + 1);
  assert.equal(mask[W - 1], DYE_SLOTS.indexOf('legs') + 1);
  const red = [200, 30, 30, 255], skin = [220, 170, 130, 255];
  const px = new Uint8ClampedArray(W * Hh * 4);
  for (let i = 0; i < W * Hh; i++) px.set(red, i * 4);
  px.set(skin, at(1, 0));
  const cloth = applyDye(px.slice(), mask, { chest: { hue: 240 } });
  assert.ok(cloth[at(0, 0) + 2] > cloth[at(0, 0)], 'red cloth on the chest turns blue');
  assert.deepEqual([...cloth.slice(at(1, 0), at(1, 0) + 4)], skin, 'skin keeps its colour');
  assert.deepEqual([...cloth.slice(at(W - 1, 0), at(W - 1, 0) + 4)], red, 'the legs are left alone');
  const all = applyDye(px.slice(), mask, { chest: { hue: 240, cover: 'all' } });
  assert.ok(all[at(1, 0) + 2] > all[at(1, 0)], 'covered whole, the warm leather turns too');
  assert.deepEqual(cleanColours({ chest: { hue: 240.4, sat: 1, val: 1 }, legs: { sat: 1 } }), { chest: { hue: 240 } });
});

test('the viewer knows the clips of every move', () => {
  execFileSync(process.execPath, [new URL('../tools/heroes/viewer/data.mjs', import.meta.url).pathname], { stdio: 'pipe' });
});
