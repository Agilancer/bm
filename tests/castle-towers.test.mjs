// Castle Velscour's lesser towers (src/core/phobos-build.js castleTowers): every one that shows its head is climbed by its
// stair turret a step at a time to its deck, every bridge between them is walked end to end, and none is left that can't
// be reached from the castle's ground or the Keep's decks. And what's found up them: a lookout on each, chests on some.
//   node --test tests/castle-towers.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { World } from '../src/sim/world.js';
import { PLAIN } from '../src/core/east.js';
import { castleFinds, castleTowers } from '../src/core/phobos-build.js';
import { castleChests, castleVistas } from '../src/core/castle-finds.js';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const world = new World(read('assets/game/village.json'), read('assets/game/interior/interior.json'));
const { towers, bridges } = castleTowers();
const climbed = towers.filter((t) => t.kind !== 'spire' && !t.buried);
const TURN = 9, RT = 2.7;

test('every tower that shows its head has a stair turret, galleries on its rhythm and a deck under its crown', () => {
  assert.ok(climbed.length >= 36, `${climbed.length} towers climbed`);
  for (const t of climbed) {
    assert.ok(Number.isFinite(t.tx) && Number.isFinite(t.ta), `${t.key}: a turret`);
    const y0 = t.from ?? PLAIN + t.levels[0];
    for (const h of [...t.levels, t.deck]) assert.ok(Math.abs(((PLAIN + h - y0) / TURN) - Math.round((PLAIN + h - y0) / TURN)) < 1e-6, `${t.key}: its gallery at ${h} is ${((PLAIN + h - y0) / TURN).toFixed(2)} turns up`);
    assert.ok(t.deck < t.top - 2 && t.deck > t.top - 40, `${t.key}: deck ${t.deck} under its crown at ${t.top}`);
  }
  assert.equal(towers.filter((t) => t.kind === 'needle' && !t.buried).length, 6, 'the six Needles');
});

test('each stair is climbed a step at a time from its foot to its deck', () => {
  for (const t of climbed) {
    const y0 = t.from ?? PLAIN + t.levels[0], top = PLAIN + t.deck, a0 = t.ta + Math.PI;
    let y = world.height(t.tx + Math.cos(a0) * RT, t.tz + Math.sin(a0) * RT, y0 + 0.2), worst = 0;
    assert.ok(Math.abs(y - y0) < 0.8, `${t.key}: its foot at ${y.toFixed(1)}, not ${y0.toFixed(1)}`);
    const n = Math.round((top - y0) / 0.5) * 3;
    for (let k = 1; k <= n; k++) {
      const a = a0 + (k / n) * ((top - y0) / TURN) * Math.PI * 2, h = world.height(t.tx + Math.cos(a) * RT, t.tz + Math.sin(a) * RT, y);
      worst = Math.max(worst, h - y); assert.ok(h > y - 0.6, `${t.key}: fell from ${y.toFixed(1)} to ${h.toFixed(1)} at step ${k} of ${n}`); y = h;
    }
    assert.ok(worst <= 0.71, `${t.key}: a step of ${worst.toFixed(2)} m`);
    assert.ok(Math.abs(y - top) < 0.6, `${t.key}: it comes out at ${y.toFixed(1)}, not its deck at ${top.toFixed(1)}`);
    // (And off the stair onto the deck, round the tower's far side.)
    const far = t.ta + Math.PI, r = (t.square ? t.r * 1.36 : t.r) + 3;
    assert.ok(Math.abs(world.height(t.x + Math.cos(far) * r, t.z + Math.sin(far) * r, y) - top) < 0.2, `${t.key}: its deck goes round it`);
  }
});

test('every bridge is walked from end to end, never a step too high nor a fall', () => {
  assert.ok(bridges.length >= 50, `${bridges.length} bridges`);
  for (const b of bridges) {
    const L = Math.hypot(b.b[0] - b.a[0], b.b[2] - b.a[2]), n = Math.ceil(L / 0.3);
    let y = world.height(b.a[0], b.a[2], b.a[1] + 0.3), worst = 0;
    assert.ok(Math.abs(y - b.a[1]) < 1.4, `${b.from} -> ${b.to}: it starts at ${y.toFixed(1)}, not ${b.a[1].toFixed(1)}`);
    for (let k = 1; k <= n; k++) {
      const h = world.height(b.a[0] + (b.b[0] - b.a[0]) * k / n, b.a[2] + (b.b[2] - b.a[2]) * k / n, y);
      worst = Math.max(worst, h - y); assert.ok(h > y - 0.9, `${b.from} -> ${b.to}: fell from ${y.toFixed(1)} to ${h.toFixed(1)}, ${(k / n * L).toFixed(0)} m along its ${L.toFixed(0)}`); y = h;
    }
    assert.ok(worst <= 0.71, `${b.from} -> ${b.to}: a step of ${worst.toFixed(2)} m`);
    assert.ok(Math.abs(y - b.b[1]) < 1.4, `${b.from} -> ${b.to}: it comes out at ${y.toFixed(1)}, not ${b.b[1].toFixed(1)}`);
  }
});

test('no tower is left that can only be looked at', () => {
  const ok = new Set(towers.filter((t) => t.kind === 'spire' || (!t.buried && t.from != null)).map((t) => t.key));
  for (let more = true; more;) { more = false; for (const b of bridges) for (const [p, q] of [[b.from, b.to], [b.to, b.from]]) if ((ok.has(p) || p.startsWith('step')) && !ok.has(q) && !q.startsWith('step')) { ok.add(q); more = true; } }
  assert.deepEqual(climbed.filter((t) => !ok.has(t.key)).map((t) => t.key), []);
});

test('a lookout on every deck, chests on some, each with an id of its own and standing on its floor', () => {
  const f = castleFinds();
  assert.ok(f.vistas.length >= 44 && f.chests.length >= 20, `${f.vistas.length} lookouts, ${f.chests.length} chests`);
  assert.ok(castleVistas().length >= f.vistas.length && castleChests().length >= f.chests.length);
  for (const c of f.chests) assert.ok(Math.abs(world.height(c.x, c.z, c.y + 0.3) - c.y) < 0.3, `${c.id} stands on its deck`);
  for (const v of f.vistas) assert.ok(v.name && !/[0-9]/.test(v.name), `${v.id}: a name`);
});
