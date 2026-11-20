// The land built on a thread of its own for the renderer (src/core/sites.js packSites, adoptSites, buildSitesApart; the
// thread is src/core/sites.worker.js). What's handed over and taken is what the renderer would have built itself, less
// what stops a body, which it never asks for.   node --test tests/sites-apart.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptSites, buildSites, packSites } from '../src/core/sites.js';

test('a land packed, sent and taken is the land that was built', () => {
  const b = buildSites(true, true);
  const want = { spots: JSON.stringify(b.spots), fires: JSON.stringify(b.fires), lamps: JSON.stringify(b.lamps), doors: JSON.stringify(b.doors), groups: JSON.stringify([...b.groups]) };
  const sums = new Map([...b.parts].map(([name, p]) => [name, [p.pos.length, p.nrm.length, p.uv.length, p.idx.length, p.pos[0], p.idx[p.idx.length - 1]]]));
  const [what, transfer] = packSites(b);
  // (As a thread's message carries it: copied, its corners' buffers handed over.)
  const got = adoptSites(structuredClone(what, { transfer }));
  assert.equal(buildSites(), got, 'and it is what buildSites gives from then on');
  assert.equal(buildSites(true, true), got, 'with its corners, for the same tier');
  for (const k of ['spots', 'fires', 'lamps', 'doors']) assert.equal(JSON.stringify(got[k]), want[k], k);
  assert.equal(JSON.stringify([...got.groups]), want.groups, 'groups');
  assert.equal(got.parts.size, sums.size);
  for (const [name, p] of got.parts) {
    assert.ok(p.pos instanceof Float32Array && p.idx instanceof Uint32Array, name);
    assert.deepEqual([p.pos.length, p.nrm.length, p.uv.length, p.idx.length, p.pos[0], p.idx[p.idx.length - 1]], sums.get(name), name);
  }
  assert.equal(got.colliders.length, 0, 'nothing that stops a body: that is the simulation\'s own build');
  assert.notEqual(buildSites(true, false), got, 'another tier\'s land is built afresh');
});

test('each seal is written down where the flattest ground for it is', async () => {
  const { SEALS } = await import('../src/core/sites.js');
  // (The same file read afresh, told to look for each seal's ground again, not read where it was written down.)
  globalThis.__bmSealsLooked = true;
  const looked = (await import('../src/core/sites.js?looked')).SEALS;
  delete globalThis.__bmSealsLooked;
  assert.equal(SEALS.length, looked.length);
  const moved = looked.filter((s, i) => s.key !== SEALS[i].key || s.x !== SEALS[i].x || s.z !== SEALS[i].z).map((s) => `${s.key}: [${s.x}, ${s.z}]`);
  assert.deepEqual(moved, [], 'SEAL_AT in src/core/sites.js wants these');
});
