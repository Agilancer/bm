// What lies about the lairs (src/core/lair-dress.js) and the masonry added for the places and the dungeons
// (tools/village/more_stone.py): every lair is some kind and has something lying about it; none of it is solid, on a
// road or in a mark of either side; and every painting a place asks for is one the game has.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Kit, buildSites, tileOf } from '../src/core/sites.js';
import { dressLairs, lairKind } from '../src/core/lair-dress.js';
import { LAIRS } from '../src/core/tripo-monsters.js';
import { routeDist } from '../src/core/lands.js';

const KINDS = ['camp', 'webs', 'plot', 'ring', 'bed', 'roost', 'den', 'picket'];
const manifest = JSON.parse(fs.readFileSync(new URL('../assets/game/tex/manifest.json', import.meta.url)));
// (The flat materials and the tints: FLAT and TINTS in src/gfx/renderer.js.)
const FLAT = new Set(['iron', 'flame', 'water', 'fruit', 'fruit2', 'white', 'tile', 'glow', 'lake', 'falls', 'ice', 'seal', 'obsidian', 'gold']);

test('every lair is dressed as one of the kinds, and every kind is used', () => {
  const seen = new Set(LAIRS.map(lairKind));
  for (const k of seen) assert.ok(KINDS.includes(k), k);
  for (const k of KINDS) assert.ok(seen.has(k), `no lair is a ${k}`);
});

test('the dressing is for the eye: no collider, nothing on a road, no cloth', () => {
  const K = new Kit();
  K.colliders.push({ x: 0, z: 0, hx: 1, hz: 1, yaw: 0, h: 1 });
  dressLairs(K, []);
  assert.equal(K.colliders.length, 1);
  let tris = 0, onRoad = 0;
  for (const [layer, p] of K.parts) {
    assert.ok(!/cloth_red|door|wall_/.test(layer), layer);
    tris += p.idx.length / 3;
    for (let i = 0; i < p.pos.length; i += 3) if (routeDist(p.pos[i], p.pos[i + 2]).d < 2.5) onRoad++;
  }
  assert.equal(onRoad, 0);
  assert.ok(tris > LAIRS.length * 60, `only ${tris} triangles`);
  assert.ok(tris < LAIRS.length * 420, `${tris} triangles: too many for what's drawn in one go`);
  // Something lies within reach of nearly every lair (a few stand in water or on a road's shoulder).
  const bare = LAIRS.filter((l) => ![...K.parts.values()].some((p) => { for (let i = 0; i < p.pos.length; i += 3) if (Math.hypot(p.pos[i] - l.x, p.pos[i + 2] - l.z) < l.r + 8) return true; return false; }));
  assert.ok(bare.length <= LAIRS.length * 0.1, `bare: ${bare.map((l) => l.key).join(', ')}`);
});

test('every painting a place or a dungeon asks for is in the game', () => {
  const have = new Set(manifest.layers.map((l) => l.name));
  for (const layer of [...buildSites().parts.keys(), ...buildSites().under.keys()]) {
    const m = /^(dark|pale|frost|mire|spore):(.*)$/.exec(layer), base = m ? m[2] : layer;
    assert.ok(have.has(base) || FLAT.has(base), `no painting called ${base}`);
  }
  for (const n of ['block', 'flags', 'ashlar', 'course']) {
    assert.ok(have.has(n), n);
    for (const s of ['c', 'd']) assert.ok(fs.existsSync(new URL(`../assets/game/tex/${n}_${s}.webp`, import.meta.url)), `${n}_${s}.webp`);
    assert.equal(tileOf(n).length, 3);
    assert.deepEqual(tileOf(`dark:${n}`), tileOf(n));
  }
});

test('no one painting is most of a dungeon any more', () => {
  const area = new Map();
  for (const [layer, p] of [...buildSites().parts, ...buildSites().under]) {
    for (let i = 0; i < p.idx.length; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => { const v = p.idx[i + k] * 3; return [p.pos[v], p.pos[v + 1], p.pos[v + 2]]; });
      if (Math.abs(a[0]) < 5600 && Math.abs(a[2]) < 5600) continue;
      if (a[0] < -5600 && Math.abs(a[2]) < 3000) continue;   // (the Test Dungeon's white hall is meant to be one thing)
      const key = `${Math.round(a[0] / 1000)},${Math.round(a[2] / 1000)}`;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const ar = 0.5 * Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]);
      const m = area.get(key) || area.set(key, new Map()).get(key);
      m.set(layer, (m.get(layer) || 0) + ar);
    }
  }
  assert.equal(area.size, 7);
  for (const [key, m] of area) {
    const all = [...m.values()].reduce((s, v) => s + v, 0), [top, most] = [...m].sort((p, q) => q[1] - p[1])[0];
    assert.ok(most / all < 0.56, `${top} is ${Math.round(most / all * 100)}% of the dungeon at ${key}`);
    assert.ok([...m.values()].filter((v) => v / all > 0.03).length >= 5, `too few paintings in the dungeon at ${key}`);
  }
});
