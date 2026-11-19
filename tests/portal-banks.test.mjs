// The dungeons' ways in out on the land are cut into banks (src/core/lands.js PORTAL_BANKS): one for each, where it is, the
// way it faces; the terrace itself left as the land was; and the bank standing behind and to the sides of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELVES, PORTAL_PAD } from '../src/core/dungeon.js';
import { PORTAL_BANKS, bankAt } from '../src/core/lands.js';

const LAND = DELVES.filter((d) => !d.within && !d.ways && Math.hypot(d.portal.x, d.portal.z) > 1150 && d.portal.x < 7000);

test('every dungeon out on the land has its bank, in its place and facing its way', () => {
  assert.equal(PORTAL_BANKS.length, LAND.length);
  for (const d of LAND) {
    const b = PORTAL_BANKS.find(([x, z]) => Math.hypot(x - d.portal.x, z - d.portal.z) < 0.5);
    assert.ok(b, `${d.key} has a bank`);
    assert.ok(Math.abs(b[2] - d.portal.yaw) < 1e-6, `${d.key}'s bank faces its way`);
  }
});

test('the terrace is on the land as it was; the bank stands behind it and to its sides', () => {
  for (const d of LAND) {
    const { x, z, yaw } = d.portal, c = Math.cos(yaw), s = Math.sin(yaw), ox = x - PORTAL_PAD.at * s, oz = z - PORTAL_PAD.at * c;
    const P = (u, w) => [ox + u * c + w * s, oz - u * s + w * c];
    const bank = (u, w) => { const [px, pz] = P(u, w); return bankAt(px, pz); };
    for (const u of [-PORTAL_PAD.hu, 0, PORTAL_PAD.hu]) for (const w of [-PORTAL_PAD.hw, 0, PORTAL_PAD.hw]) assert.ok(Math.abs(bank(u, w)) < 0.05, `${d.key}: nothing under its terrace at ${u}, ${w}`);
    if (d.key !== 'blackvigil') assert.ok(bank(0, -PORTAL_PAD.hw - 5) > 4, `${d.key}: a bank behind it`);
    assert.ok(bank(PORTAL_PAD.hu + 6, -2) > 3 && bank(-PORTAL_PAD.hu - 6, -2) > 3, `${d.key}: banks either side`);
  }
});
